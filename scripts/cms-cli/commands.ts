/**
 * CMS CLI コマンド実装
 * lib/cms-agent 経由で Admin API（PATCH + publish）を呼び出す。
 * DB 直叩き・migrate reset・seed・raw SQL は禁止。
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { File } from 'node:buffer';

import {
  CmsAgentError,
  loadDeveloperContent,
  saveDraft,
  type CmsAgentOptions,
  type DeveloperContentSnapshot,
} from '@/lib/cms-agent';
import { createCmsAgentClient, type CmsAgentConfig } from '@/lib/cms-agent/api-client';
import {
  addFieldGroup,
  setFieldValue,
  type FieldPathSpec,
} from '@/lib/cms-agent/field-ops';
import type { AssetRecord, ContentRecord, CmsClientResult } from '@/lib/cms-agent/types';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface CliArgs {
  site?: string;
  type?: string;
  id?: string;
  file?: string;
  draft?: boolean;
  path?: string;
  value?: string;
  name?: string;
  paths?: string;
  rich?: boolean;
  'base-url'?: string;
}

interface ContentList {
  items: ContentRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// 設定・エラーヘルパー
// ---------------------------------------------------------------------------

function resolveBaseUrl(override?: string): string {
  return (
    override ??
    process.env.CMS_BASE_URL ??
    process.env.APP_URL ??
    'http://localhost:3000'
  );
}

function buildClientConfig(args: CliArgs): CmsAgentConfig {
  return { baseUrl: resolveBaseUrl(args['base-url']) };
}

function buildAgentOptions(args: CliArgs): CmsAgentOptions {
  return { baseUrl: resolveBaseUrl(args['base-url']) };
}

function throwWithCode(message: string, code: string): never {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  throw error;
}

function unwrapClientResult<T>(result: CmsClientResult<T>): T {
  if (!result.ok) {
    throwWithCode(result.error ?? `HTTP ${result.status}`, result.code ?? 'api_error');
  }
  return result.data as T;
}

async function runAgent<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof CmsAgentError) {
      throwWithCode(err.message, err.code ?? 'api_error');
    }
    throw err;
  }
}

function snapshotToContentRecord(snapshot: DeveloperContentSnapshot): ContentRecord {
  return {
    id: snapshot.id,
    siteId: snapshot.siteId,
    contentType: snapshot.contentType,
    slug: snapshot.slug || null,
    title: snapshot.title || null,
    status: snapshot.status,
    dataJson: snapshot.data,
    createdBy: null,
    updatedBy: null,
    publishedAt: snapshot.publishedAt,
    createdAt: snapshot.updatedAt,
    updatedAt: snapshot.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// 出力ヘルパー
// ---------------------------------------------------------------------------

export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

export function outputError(code: string, message: string): void {
  process.stderr.write(JSON.stringify({ ok: false, code, error: message }) + '\n');
}

// ---------------------------------------------------------------------------
// 共通ユーティリティ
// ---------------------------------------------------------------------------

function siteType(args: CliArgs): { siteId: string; contentType: string } {
  return {
    siteId: args.site ?? 'main-site',
    contentType: args.type ?? 'topPage',
  };
}

/** listContent は api-client 未実装のため、認証設定のみ共有して GET する。 */
async function fetchContentList(
  config: CmsAgentConfig,
  siteId: string,
  contentType: string,
): Promise<ContentList> {
  const baseUrl = resolveBaseUrl(config.baseUrl).replace(/\/$/, '');
  const apiKey = config.apiKey ?? process.env.CMS_ADMIN_API_KEY ?? 'admin-dev-key';
  const url = `${baseUrl}/api/admin/sites/${siteId}/content/${contentType}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', 'x-api-key': apiKey },
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    let code = 'api_error';
    let message = `HTTP ${res.status}`;
    if (text.trim()) {
      try {
        const body = JSON.parse(text) as { error?: string; code?: string };
        if (typeof body.error === 'string') message = body.error;
        if (typeof body.code === 'string') code = body.code;
      } catch {
        // ignore
      }
    }
    throwWithCode(message, code);
  }

  if (!text.trim()) {
    return { items: [], total: 0, limit: 0, offset: 0 };
  }

  const json = JSON.parse(text) as unknown;
  if (Array.isArray(json)) {
    return {
      items: json as ContentRecord[],
      total: json.length,
      limit: json.length,
      offset: 0,
    };
  }

  const list = json as ContentList;
  return {
    items: list.items ?? [],
    total: list.total ?? list.items?.length ?? 0,
    limit: list.limit ?? list.items?.length ?? 0,
    offset: list.offset ?? 0,
  };
}

async function resolveContentId(
  config: CmsAgentConfig,
  siteId: string,
  contentType: string,
  id?: string,
): Promise<string> {
  if (id) return id;

  const list = await fetchContentList(config, siteId, contentType);
  const items = list.items ?? [];

  if (items.length === 0) {
    throw new Error(`No content found for type "${contentType}" in site "${siteId}".`);
  }
  if (items.length > 1) {
    throw new Error(
      `Multiple contents (${items.length}) found. Specify --id.\n` +
        items.map((c) => `  ${c.id}  ${c.title ?? '(no title)'}`).join('\n'),
    );
  }

  return items[0]!.id;
}

/**
 * パス名からデフォルト値を推測する
 */
function defaultValueForPath(pathName: string): unknown {
  const lower = pathName.toLowerCase();
  if (lower === 'image' || lower.endsWith('image') || lower.endsWith('img')) {
    return { url: '', alt: '' };
  }
  return '';
}

function parseFieldValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed === 'null' ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    /^-?\d+(\.\d+)?$/.test(trimmed)
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // 文字列のまま使用
    }
  }
  return raw;
}

function buildFieldPathSpecs(pathList: string[], useRich: boolean): FieldPathSpec[] {
  return pathList
    .filter((suffix) => suffix === 'title' || suffix === 'text')
    .map((suffix) => ({
      suffix,
      format: useRich ? 'richText' : 'plain',
    }));
}

function applyFieldAdd(
  data: Record<string, unknown>,
  fieldFormats: Record<string, 'plain' | 'richText'>,
  fieldName: string,
  pathList: string[],
  useRich: boolean,
): { data: Record<string, unknown>; fieldFormats: Record<string, 'plain' | 'richText'> } {
  if (pathList.length === 0) {
    throw new Error('--paths must have at least one path component.');
  }

  if (pathList.length === 1 && pathList[0] === fieldName) {
    let nextData = setFieldValue(data, fieldName, '');
    const nextFormats = {
      ...fieldFormats,
      [fieldName]: useRich ? 'richText' : 'plain',
    };
    return { data: nextData, fieldFormats: nextFormats };
  }

  let nextData = data;
  let nextFormats = { ...fieldFormats };

  if (pathList.length === 1 && !pathList[0]!.includes('.')) {
    const subPath = pathList[0]!;
    const fullPath = `${fieldName}.${subPath}`;
    const defaultVal = defaultValueForPath(subPath);
    nextData = setFieldValue(nextData, fullPath, defaultVal);
    if (typeof defaultVal === 'string') {
      nextFormats[fullPath] = useRich ? 'richText' : 'plain';
    }
  } else {
    for (const subPath of pathList) {
      const fullPath = `${fieldName}.${subPath}`;
      const defaultVal = defaultValueForPath(subPath);
      nextData = setFieldValue(nextData, fullPath, defaultVal);
      if (typeof defaultVal === 'string') {
        nextFormats[fullPath] = useRich ? 'richText' : 'plain';
      }
    }
  }

  const specs = buildFieldPathSpecs(pathList, useRich);
  if (specs.length > 0) {
    const grouped = addFieldGroup(nextData, nextFormats, {
      prefix: fieldName,
      fieldPaths: specs,
    });
    nextData = grouped.data;
    nextFormats = grouped.fieldFormats;
  }

  return { data: nextData, fieldFormats: nextFormats };
}

// ---------------------------------------------------------------------------
// content get
// ---------------------------------------------------------------------------

export async function contentGet(args: CliArgs): Promise<void> {
  const { siteId, contentType } = siteType(args);
  const config = buildClientConfig(args);
  const client = createCmsAgentClient(config);

  if (args.id) {
    const record = unwrapClientResult(
      await client.getContent(siteId, contentType, args.id),
    );
    outputJson({ ok: true, data: record });
    return;
  }

  const list = await fetchContentList(config, siteId, contentType);
  outputJson({ ok: true, data: list });
}

// ---------------------------------------------------------------------------
// content save
// ---------------------------------------------------------------------------

export async function contentSave(args: CliArgs): Promise<void> {
  const { siteId, contentType } = siteType(args);
  const config = buildClientConfig(args);
  const options = buildAgentOptions(args);
  const client = createCmsAgentClient(config);

  if (!args.file) {
    throw new Error('--file <path> is required for content save.');
  }

  const filePath = resolve(process.cwd(), args.file);
  let fileBody: Record<string, unknown>;
  try {
    fileBody = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Failed to read or parse file "${args.file}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const id = await resolveContentId(config, siteId, contentType, args.id);
  const current = unwrapClientResult(await client.getContent(siteId, contentType, id));

  let data: Record<string, unknown>;
  if ('data' in fileBody || 'title' in fileBody || 'slug' in fileBody || 'fieldFormats' in fileBody) {
    data = (fileBody.data as Record<string, unknown> | undefined) ?? current.dataJson;
  } else {
    data = { ...current.dataJson, ...fileBody };
  }

  const saveParams = {
    siteId,
    contentType,
    id,
    title: String(fileBody.title ?? current.title ?? ''),
    slug: String(fileBody.slug ?? current.slug ?? ''),
    data,
    fieldFormats:
      (fileBody.fieldFormats as Record<string, 'plain' | 'richText'> | undefined) ??
      undefined,
  };

  if (args.draft) {
    const updated = await runAgent(() => saveDraft(saveParams, options));
    outputJson({ ok: true, data: snapshotToContentRecord(updated) });
    return;
  }

  const status =
    (fileBody.status as ContentRecord['status'] | undefined) ??
    current.status ??
    'draft';

  const updated = unwrapClientResult(
    await client.patchContent(siteId, contentType, id, {
      ...saveParams,
      status,
    }),
  );

  outputJson({ ok: true, data: updated });
}

// ---------------------------------------------------------------------------
// content publish
// ---------------------------------------------------------------------------

export async function contentPublish(args: CliArgs): Promise<void> {
  const { siteId, contentType } = siteType(args);
  const config = buildClientConfig(args);
  const client = createCmsAgentClient(config);

  const id = await resolveContentId(config, siteId, contentType, args.id);

  const result = unwrapClientResult(
    await client.publishContent(siteId, contentType, id),
  );

  outputJson({ ok: true, data: result });
}

// ---------------------------------------------------------------------------
// field set
// ---------------------------------------------------------------------------

export async function fieldSet(args: CliArgs): Promise<void> {
  const { siteId, contentType } = siteType(args);
  const config = buildClientConfig(args);
  const options = buildAgentOptions(args);
  const client = createCmsAgentClient(config);

  if (!args.path) throw new Error('--path is required for field set.');
  if (args.value === undefined) throw new Error('--value is required for field set.');

  const id = await resolveContentId(config, siteId, contentType, args.id);
  const current = await runAgent(() =>
    loadDeveloperContent(siteId, contentType, id, options),
  );

  const data = setFieldValue(current.data, args.path, parseFieldValue(args.value));

  const updated = unwrapClientResult(
    await client.patchContent(siteId, contentType, id, {
      title: current.title,
      slug: current.slug,
      status: current.status,
      data,
      fieldFormats: current.fieldFormats,
    }),
  );

  outputJson({ ok: true, data: updated });
}

// ---------------------------------------------------------------------------
// field add
// ---------------------------------------------------------------------------

export async function fieldAdd(args: CliArgs): Promise<void> {
  const { siteId, contentType } = siteType(args);
  const config = buildClientConfig(args);
  const options = buildAgentOptions(args);
  const client = createCmsAgentClient(config);

  if (!args.name) throw new Error('--name is required for field add.');
  if (!args.paths) throw new Error('--paths is required for field add.');

  const id = await resolveContentId(config, siteId, contentType, args.id);
  const current = await runAgent(() =>
    loadDeveloperContent(siteId, contentType, id, options),
  );

  const pathList = args.paths.split(',').map((p) => p.trim()).filter(Boolean);
  const { data, fieldFormats } = applyFieldAdd(
    current.data,
    current.fieldFormats,
    args.name,
    pathList,
    args.rich ?? false,
  );

  const updated = unwrapClientResult(
    await client.patchContent(siteId, contentType, id, {
      title: current.title,
      slug: current.slug,
      status: current.status,
      data,
      fieldFormats,
    }),
  );

  outputJson({ ok: true, data: updated });
}

// ---------------------------------------------------------------------------
// asset upload
// ---------------------------------------------------------------------------

export async function assetUpload(args: CliArgs): Promise<void> {
  const { siteId } = siteType(args);
  const config = buildClientConfig(args);
  const client = createCmsAgentClient(config);

  if (!args.file) throw new Error('--file <path> is required for asset upload.');

  const filePath = resolve(process.cwd(), args.file);
  let fileBuffer: Buffer;
  try {
    fileBuffer = readFileSync(filePath);
  } catch (err) {
    throw new Error(
      `Cannot read file "${args.file}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const filename = filePath.split('/').pop() ?? 'upload';
  const blob = new File([fileBuffer], filename);

  const result = unwrapClientResult<AssetRecord>(
    await client.uploadAsset(siteId, blob, { filename }),
  );

  outputJson({ ok: true, data: result });
}
