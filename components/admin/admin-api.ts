/** 管理 API 向け fetch・認証・レスポンス変換（components/admin 専用） */

export const ADMIN_SESSION_COOKIE = 'cms_session';
export const ADMIN_SESSION_STORAGE_KEY = 'cms_session_token';
export const ADMIN_SESSION_LOGGED_OUT_KEY = 'cms_session_logged_out';
export const ADMIN_DEV_SESSION_TOKEN = 'session-dev-token';

export interface ApiErrorBody {
  error?: string;
  code?: string;
}

export interface AdminFetchResult<T> {
  ok: boolean;
  data: T | null;
  status: number;
  error?: string;
  code?: string;
}

export interface ApiContentRecord {
  id: string;
  siteId: string;
  contentType: string;
  slug: string | null;
  title: string | null;
  status: 'draft' | 'published' | 'unpublished';
  dataJson: Record<string, unknown>;
  createdBy: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiContentCollection {
  items: ApiContentRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiSchemaRecord {
  id: string;
  siteId: string;
  name: string;
  apiName: string;
  type: 'single' | 'collection';
  schemaJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSchemasResponse {
  siteId: string;
  schemas: ApiSchemaRecord[];
}

export interface ApiAssetRecord {
  id: string;
  siteId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ApiAssetCollection {
  items: ApiAssetRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiSiteSummary {
  id: string;
  slug: string;
  name: string;
  domain: string;
  description: string;
  publishedCount: number;
  draftCount: number;
  imageUsage: string;
  updatedAt: string;
}


export interface ApiSiteMemberRecord {
  id: string;
  siteId: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface ApiSiteMemberCollection {
  items: ApiSiteMemberRecord[];
  total: number;
}

export interface ApiAuditLogRecord {
  id: string;
  siteId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ApiAuditLogCollection {
  items: ApiAuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiCreateSiteResponse {
  site: ApiSiteSummary;
  apiKeys: {
    public: string;
    admin: string;
  };
}

export interface ImageFieldValue {
  url: string;
  alt: string;
}

export type FieldDraftValue = string | number | boolean | ImageFieldValue;

function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function isAdminSessionLoggedOut(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(ADMIN_SESSION_LOGGED_OUT_KEY) === '1';
}

/** ログイン画面の自動遷移用。dev フォールバックは含めない。 */
export function hasPersistedAdminSession(): boolean {
  if (typeof window === 'undefined' || isAdminSessionLoggedOut()) {
    return false;
  }

  if (window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)) {
    return true;
  }

  return Boolean(readBrowserCookie(ADMIN_SESSION_COOKIE));
}

export function resolveClientSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (isAdminSessionLoggedOut()) {
    return null;
  }

  const stored = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const cookie = readBrowserCookie(ADMIN_SESSION_COOKIE);
  if (cookie) {
    return cookie;
  }

  if (process.env.NODE_ENV !== 'production') {
    return ADMIN_DEV_SESSION_TOKEN;
  }

  return null;
}

export function persistAdminSession(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_LOGGED_OUT_KEY);
  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
  document.cookie = `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(ADMIN_SESSION_LOGGED_OUT_KEY, '1');
  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  document.cookie = `${ADMIN_SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
}

export function buildAdminAuthHeaders(sessionToken?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = sessionToken ?? resolveClientSessionToken();
  if (token) {
    headers['x-session-token'] = token;
  }

  return headers;
}

export async function adminFetch<T>(
  url: string,
  init: RequestInit = {},
  sessionToken?: string | null,
): Promise<AdminFetchResult<T>> {
  const headers = new Headers(init.headers ?? {});
  const authHeaders = buildAdminAuthHeaders(sessionToken);

  for (const [key, value] of Object.entries(authHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  if (!(init.body instanceof FormData) && !headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (response.status === 204) {
      return { ok: true, data: null, status: 204 };
    }

    const text = await response.text();
    if (!text.trim()) {
      if (!response.ok) {
        return {
          ok: false,
          data: null,
          status: response.status,
          error: `HTTP ${response.status}`,
          code: 'empty_response',
        };
      }

      return { ok: true, data: null, status: response.status };
    }

    let body: T | ApiErrorBody;
    try {
      body = JSON.parse(text) as T | ApiErrorBody;
    } catch {
      return {
        ok: false,
        data: null,
        status: response.status,
        error: 'Invalid JSON response',
        code: 'invalid_json',
      };
    }

    if (!response.ok) {
      const errorBody = body as ApiErrorBody;
      return {
        ok: false,
        data: null,
        status: response.status,
        error: errorBody.error ?? `HTTP ${response.status}`,
        code: errorBody.code,
      };
    }

    return {
      ok: true,
      data: body as T,
      status: response.status,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Network request failed';
    return {
      ok: false,
      data: null,
      status: 0,
      error: message,
      code: 'network_error',
    };
  }
}

export function mapApiContentRecord(record: ApiContentRecord) {
  const data = record.dataJson ?? {};
  const summary =
    typeof data.summary === 'string'
      ? data.summary
      : typeof data.lead === 'string'
        ? data.lead
        : '';

  return {
    id: record.id,
    contentType: record.contentType,
    siteId: record.siteId,
    title: record.title ?? '',
    slug: record.slug ?? '',
    status: record.status,
    updatedAt: record.updatedAt,
    author: record.updatedBy ?? record.createdBy ?? '—',
    summary,
    data,
  };
}

export function buildContentWriteBody(input: {
  title: string;
  slug: string;
  data: Record<string, unknown>;
  status?: 'draft' | 'published' | 'unpublished';
}) {
  return {
    title: input.title,
    slug: input.slug,
    status: input.status ?? 'draft',
    data: input.data,
  };
}

export function getFieldKey(field: { key?: string; name?: string }): string {
  return String(field.key ?? field.name ?? '').trim();
}

export function readFieldValue(data: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function writeFieldValue(data: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');

  if (parts.length === 1) {
    data[key] = value;
    return;
  }

  let current = data;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const next = current[part];

    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1] ?? ''] = value;
}

export function formatFieldDraftValue(
  value: unknown,
  fieldType: string,
): FieldDraftValue {
  if (value === undefined || value === null || value === '') {
    if (fieldType === 'boolean') {
      return false;
    }

    if (fieldType === 'number') {
      return '';
    }

    if (fieldType === 'image') {
      return { url: '', alt: '' };
    }

    return '';
  }

  if (fieldType === 'boolean') {
    return Boolean(value);
  }

  if (fieldType === 'number') {
    return String(value);
  }

  if (fieldType === 'sectionArray' && (Array.isArray(value) || typeof value === 'object')) {
    return JSON.stringify(value, null, 2);
  }

  if (fieldType === 'image') {
    if (value && typeof value === 'object' && 'url' in value) {
      const imageValue = value as { url?: unknown; alt?: unknown };
      return {
        url: String(imageValue.url ?? ''),
        alt: String(imageValue.alt ?? ''),
      };
    }

    if (typeof value === 'string') {
      return { url: value, alt: '' };
    }

    return { url: '', alt: '' };
  }

  return String(value);
}
