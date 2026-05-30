/** lib/cms-agent — サーバーサイド（CLI/MCP）向け CMS 管理 API クライアント型定義 */

export interface CmsAgentConfig {
  /** CMS サーバーのベース URL。省略時は CMS_BASE_URL 環境変数、それもなければ http://localhost:3000 */
  baseUrl?: string;
  /** 管理 API キー。省略時は CMS_ADMIN_API_KEY 環境変数、それもなければ 'admin-dev-key'（開発時のみ） */
  apiKey?: string;
}

export interface CmsClientResult<T> {
  ok: boolean;
  data: T | null;
  status: number;
  error?: string;
  code?: string;
}

export type ContentStatus = 'draft' | 'published' | 'unpublished';

export interface ContentRecord {
  id: string;
  siteId: string;
  contentType: string;
  slug: string | null;
  title: string | null;
  status: ContentStatus;
  dataJson: Record<string, unknown>;
  createdBy: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PATCH コンテンツ API へ送るボディ入力。buildContentWriteBody と同一形状。 */
export interface ContentWriteInput {
  title: string;
  slug: string;
  data: Record<string, unknown>;
  /** 省略時は 'draft' */
  status?: ContentStatus;
  /** composable フィールドの plain/richText 設定マップ */
  fieldFormats?: Record<string, 'plain' | 'richText'>;
}

export interface AssetRecord {
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

export type FieldFormat = 'plain' | 'richText';
export type FieldType = 'title' | 'text' | 'image' | 'href';

export interface FieldManifestEntry {
  path: string;
  type: FieldType;
  format: FieldFormat;
}

export interface FieldManifest {
  siteId: string;
  contentType: string;
  paths: FieldManifestEntry[];
}

/** GET /api/admin/sites/{siteId}/content/{contentType}/{id} — UI 向け（data キー） */
export interface AdminUiContentRecord {
  id: string;
  siteId: string;
  contentType: string;
  title: string | null;
  slug: string | null;
  status: ContentStatus;
  data: Record<string, unknown>;
  updatedAt: string;
  publishedAt?: string | null;
}

/** GET /api/admin/sites/{siteId}/schemas の各要素 */
export interface ContentSchemaRecord {
  apiName: string;
  schemaJson: Record<string, unknown>;
}
