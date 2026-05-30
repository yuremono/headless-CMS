import {
  buildRepeatableArrayValue,
  collectComposableFieldFormats,
  restoreGroupsFromData,
  type ComposableFieldFormat,
  type ComposableFieldGroup,
} from './field-catalog';
import { createCmsAgentClient } from './api-client';
import type { CmsAgentConfig, CmsClientResult, ContentRecord, ContentSchemaRecord } from './types';

export type { ComposableFieldFormat, ComposableFieldGroup };
export { buildRepeatableArrayValue, collectComposableFieldFormats, restoreGroupsFromData };

/** @deprecated Use {@link CmsAgentConfig} from `./types` or `@/lib/cms-agent`. */
export type CmsAgentOptions = CmsAgentConfig;

/** Full content snapshot returned by loadDeveloperContent. */
export interface DeveloperContentSnapshot {
  id: string;
  siteId: string;
  contentType: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'unpublished';
  data: Record<string, unknown>;
  fieldFormats: Record<string, 'plain' | 'richText'>;
  updatedAt: string;
  publishedAt: string | null;
}

/** Input parameters for saveDraft and publishContent. */
export interface ContentSaveParams {
  siteId: string;
  contentType: string;
  id: string;
  data: Record<string, unknown>;
  fieldFormats?: Record<string, 'plain' | 'richText'>;
  title?: string;
  slug?: string;
}

export class CmsAgentError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'CmsAgentError';
  }
}

function assertOk<T>(result: CmsClientResult<T>): T {
  if (!result.ok || result.data === null) {
    throw new CmsAgentError(result.error ?? `HTTP ${result.status}`, result.status, result.code);
  }
  return result.data;
}

function extractFieldFormatsFromSchema(
  schemas: ContentSchemaRecord[],
  contentType: string,
): Record<string, 'plain' | 'richText'> {
  const schema = schemas.find((s) => s.apiName === contentType);
  const raw = schema?.schemaJson?.['composableFieldFormats'];
  const formats: Record<string, 'plain' | 'richText'> = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [path, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value === 'plain' || value === 'richText') {
        formats[path] = value;
      }
    }
  }
  return formats;
}

function toSnapshot(
  record: ContentRecord,
  fieldFormats: Record<string, 'plain' | 'richText'>,
): DeveloperContentSnapshot {
  return {
    id: record.id,
    siteId: record.siteId,
    contentType: record.contentType,
    title: record.title ?? '',
    slug: record.slug ?? '',
    status: record.status,
    data: record.dataJson ?? {},
    fieldFormats,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt ?? null,
  };
}

/**
 * Write a value into a nested object using dot-separated path.
 * Numeric path segments are treated as array indices.
 */
export function writeFieldValue(data: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');

  if (parts.length === 1) {
    data[key] = value;
    return;
  }

  let current: Record<string, unknown> | unknown[] = data;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]!;
    const nextPart = parts[i + 1];
    const nextIsIndex = nextPart !== undefined && /^\d+$/.test(nextPart);

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(part, 10);
      if (!Number.isFinite(arrayIndex)) {
        return;
      }
      const existing = current[arrayIndex];
      if (
        nextIsIndex
          ? !Array.isArray(existing)
          : !existing || typeof existing !== 'object' || Array.isArray(existing)
      ) {
        current[arrayIndex] = nextIsIndex ? [] : {};
      }
      current = current[arrayIndex] as Record<string, unknown> | unknown[];
      continue;
    }

    const rec = current as Record<string, unknown>;
    const next = rec[part];

    if (nextIsIndex) {
      if (!Array.isArray(next)) {
        rec[part] = [];
      }
      current = rec[part] as unknown[];
      continue;
    }

    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      rec[part] = {};
    }

    current = rec[part] as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1] ?? '';

  if (Array.isArray(current)) {
    const arrayIndex = Number.parseInt(leaf, 10);
    if (Number.isFinite(arrayIndex)) {
      current[arrayIndex] = value;
    }
    return;
  }

  (current as Record<string, unknown>)[leaf] = value;
}

/**
 * Merge ComposableFieldGroup list into a flat data record.
 * Mirrors the private mergeDataForSave in ComposableContentForm.tsx.
 * Use with restoreGroupsFromData to prepare data before saveDraft / publishContent.
 */
export function mergeDataForSave(
  baseData: Record<string, unknown>,
  groups: ComposableFieldGroup[],
): Record<string, unknown> {
  const merged = structuredClone(baseData) as Record<string, unknown>;

  for (const group of groups) {
    if (group.repeatable) {
      const prefix = group.prefix.trim();
      if (prefix) {
        merged[prefix] = buildRepeatableArrayValue(group.items ?? []);
      }
      continue;
    }

    for (const field of group.fields) {
      writeFieldValue(merged, field.jsonPath, field.value);
    }
  }

  return merged;
}

/**
 * Load content snapshot including dataJson and fieldFormats.
 * Mirrors what ContentEditView loads before rendering ComposableContentForm.
 */
export async function loadDeveloperContent(
  siteId: string,
  contentType: string,
  id: string,
  options?: CmsAgentConfig,
): Promise<DeveloperContentSnapshot> {
  const client = createCmsAgentClient(options);

  const [contentResult, schemasResult] = await Promise.all([
    client.getAdminUiContent(siteId, contentType, id),
    client.getSchemas(siteId),
  ]);

  const content = assertOk(contentResult);
  const schemas = assertOk(schemasResult);
  const fieldFormats = extractFieldFormatsFromSchema(schemas, contentType);

  return {
    id: content.id,
    siteId: content.siteId,
    contentType,
    title: content.title ?? '',
    slug: content.slug ?? '',
    status: content.status,
    data: content.data ?? {},
    fieldFormats,
    updatedAt: content.updatedAt,
    publishedAt: content.publishedAt ?? null,
  };
}

/**
 * PATCH content with status=draft.
 * Mirrors ComposableContentForm.persist('save').
 */
export async function saveDraft(
  params: ContentSaveParams,
  options?: CmsAgentConfig,
): Promise<DeveloperContentSnapshot> {
  const client = createCmsAgentClient(options);
  const record = assertOk(
    await client.patchContent(params.siteId, params.contentType, params.id, {
      title: params.title ?? '',
      slug: params.slug ?? '',
      status: 'draft',
      data: params.data,
      ...(params.fieldFormats !== undefined ? { fieldFormats: params.fieldFormats } : {}),
    }),
  );
  return toSnapshot(record, params.fieldFormats ?? {});
}

/**
 * PATCH content then POST to publish endpoint.
 * Mirrors ComposableContentForm.persist('publish').
 */
export async function publishContent(
  params: ContentSaveParams,
  options?: CmsAgentConfig,
): Promise<DeveloperContentSnapshot> {
  const client = createCmsAgentClient(options);

  assertOk(
    await client.patchContent(params.siteId, params.contentType, params.id, {
      title: params.title ?? '',
      slug: params.slug ?? '',
      status: 'published',
      data: params.data,
      ...(params.fieldFormats !== undefined ? { fieldFormats: params.fieldFormats } : {}),
    }),
  );

  const publishRecord = assertOk(
    await client.publishContent(params.siteId, params.contentType, params.id),
  );

  return toSnapshot(publishRecord, params.fieldFormats ?? {});
}
