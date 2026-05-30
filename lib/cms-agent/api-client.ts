/**
 * サーバーサイド（CLI/MCP）向け CMS 管理 API HTTP クライアント。
 *
 * ブラウザの adminFetch とは独立したサーバー専用実装。
 * 認証: x-api-key ヘッダー（CMS_ADMIN_API_KEY 環境変数 / 開発フォールバック 'admin-dev-key'）。
 */

import type {
  AdminUiContentRecord,
  AssetRecord,
  CmsAgentConfig,
  CmsClientResult,
  ContentRecord,
  ContentSchemaRecord,
  ContentWriteInput,
  FieldManifest,
} from './types';

const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEV_ADMIN_API_KEY = 'admin-dev-key';

function resolveConfig(config: CmsAgentConfig): { baseUrl: string; apiKey: string } {
  return {
    baseUrl: config.baseUrl ?? process.env['CMS_BASE_URL'] ?? DEFAULT_BASE_URL,
    apiKey: config.apiKey ?? process.env['CMS_ADMIN_API_KEY'] ?? DEV_ADMIN_API_KEY,
  };
}

async function agentRequest<T>(
  url: string,
  init: RequestInit,
  apiKey: string,
): Promise<CmsClientResult<T>> {
  const headers = new Headers({
    Accept: 'application/json',
    'x-api-key': apiKey,
  });

  if (init.headers) {
    for (const [key, value] of new Headers(init.headers as HeadersInit).entries()) {
      headers.set(key, value);
    }
  }

  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, { ...init, headers, cache: 'no-store' });

    if (response.status === 204) {
      return { ok: true, data: null, status: 204 };
    }

    const text = await response.text();

    if (!text.trim()) {
      if (!response.ok) {
        return { ok: false, data: null, status: response.status, error: `HTTP ${response.status}`, code: 'empty_response' };
      }
      return { ok: true, data: null, status: response.status };
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, data: null, status: response.status, error: 'Invalid JSON response', code: 'invalid_json' };
    }

    if (!response.ok) {
      const err = body as { error?: string; code?: string };
      return {
        ok: false,
        data: null,
        status: response.status,
        error: err.error ?? `HTTP ${response.status}`,
        code: err.code,
      };
    }

    return { ok: true, data: body as T, status: response.status };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    return { ok: false, data: null, status: 0, error: message, code: 'network_error' };
  }
}

export interface CmsAgentClient {
  /** コンテンツレコードを取得する（GET — dataJson 形状、PATCH レスポンス互換） */
  getContent(siteId: string, contentType: string, id: string): Promise<CmsClientResult<ContentRecord>>;
  /** developer UI 向けコンテンツ取得（GET — data キー） */
  getAdminUiContent(
    siteId: string,
    contentType: string,
    id: string,
  ): Promise<CmsClientResult<AdminUiContentRecord>>;
  /** サイトのスキーマ一覧を取得する */
  getSchemas(siteId: string): Promise<CmsClientResult<ContentSchemaRecord[]>>;
  /**
   * コンテンツを PATCH 保存する。
   * ボディ形状は ComposableContentForm.persist の buildContentWriteBody と同一。
   */
  patchContent(
    siteId: string,
    contentType: string,
    id: string,
    input: ContentWriteInput,
  ): Promise<CmsClientResult<ContentRecord>>;
  /** コンテンツを公開する（POST .../publish） */
  publishContent(siteId: string, contentType: string, id: string): Promise<CmsClientResult<ContentRecord>>;
  /** アセット（画像等）をアップロードする（multipart POST） */
  uploadAsset(
    siteId: string,
    file: Blob,
    options?: { alt?: string; filename?: string },
  ): Promise<CmsClientResult<AssetRecord>>;
  /** フィールドマニフェストを取得する（GET manifest） */
  getContentManifest(
    siteId: string,
    contentType: string,
    options?: { id?: string },
  ): Promise<CmsClientResult<FieldManifest>>;
}

/**
 * CMS 管理 API クライアントを生成する。
 *
 * @example
 * ```ts
 * import { createCmsAgentClient } from '@/lib/cms-agent/api-client';
 *
 * const cms = createCmsAgentClient();
 * const { data } = await cms.getContent('main-site', 'topPage', 'record-id');
 * await cms.patchContent('main-site', 'topPage', 'record-id', {
 *   title: data.title ?? '',
 *   slug: data.slug ?? '',
 *   data: { ...data.dataJson, 'hero.title': '新しいタイトル' },
 * });
 * await cms.publishContent('main-site', 'topPage', 'record-id');
 * ```
 */
export function createCmsAgentClient(config: CmsAgentConfig = {}): CmsAgentClient {
  const { baseUrl, apiKey } = resolveConfig(config);

  function endpoint(path: string): string {
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  return {
    getContent(siteId, contentType, id) {
      return agentRequest<ContentRecord>(
        endpoint(`/api/admin/sites/${siteId}/content/${contentType}/${id}`),
        { method: 'GET' },
        apiKey,
      );
    },

    getAdminUiContent(siteId, contentType, id) {
      return agentRequest<AdminUiContentRecord>(
        endpoint(`/api/admin/sites/${siteId}/content/${contentType}/${id}`),
        { method: 'GET' },
        apiKey,
      );
    },

    getSchemas(siteId) {
      return agentRequest<ContentSchemaRecord[]>(
        endpoint(`/api/admin/sites/${siteId}/schemas`),
        { method: 'GET' },
        apiKey,
      );
    },

    patchContent(siteId, contentType, id, input) {
      return agentRequest<ContentRecord>(
        endpoint(`/api/admin/sites/${siteId}/content/${contentType}/${id}`),
        { method: 'PATCH', body: JSON.stringify(buildContentWriteBody(input)) },
        apiKey,
      );
    },

    publishContent(siteId, contentType, id) {
      return agentRequest<ContentRecord>(
        endpoint(`/api/admin/sites/${siteId}/content/${contentType}/${id}/publish`),
        { method: 'POST' },
        apiKey,
      );
    },

    async uploadAsset(siteId, file, options = {}) {
      const form = new FormData();
      const filename = options.filename ?? (file instanceof File ? file.name : 'upload');
      form.append('file', file, filename);
      if (options.alt !== undefined) {
        form.append('alt', options.alt);
      }
      return agentRequest<AssetRecord>(
        endpoint(`/api/admin/sites/${siteId}/assets`),
        { method: 'POST', body: form },
        apiKey,
      );
    },

    getContentManifest(siteId, contentType, options = {}) {
      const params = new URLSearchParams();
      if (options.id) {
        params.set('id', options.id);
      }
      const qs = params.toString();
      return agentRequest<FieldManifest>(
        endpoint(`/api/admin/sites/${siteId}/content/${contentType}/manifest${qs ? `?${qs}` : ''}`),
        { method: 'GET' },
        apiKey,
      );
    },
  };
}

/**
 * PATCH コンテンツ API に送るボディを組み立てる。
 * ComposableContentForm の buildContentWriteBody と同一の形状を保証する。
 */
export function buildContentWriteBody(input: ContentWriteInput): {
  title: string;
  slug: string;
  status: string;
  data: Record<string, unknown>;
  fieldFormats?: Record<string, 'plain' | 'richText'>;
} {
  return {
    title: input.title,
    slug: input.slug,
    status: input.status ?? 'draft',
    data: input.data,
    ...(input.fieldFormats ? { fieldFormats: input.fieldFormats } : {}),
  };
}
