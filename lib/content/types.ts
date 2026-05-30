export type ContentStatus = "draft" | "published" | "unpublished";
export type ContentModelType = "single" | "collection";

export interface ContentModelRecord {
  id: string;
  siteId: string;
  name: string;
  apiName: string;
  type: ContentModelType;
  schemaJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

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

export interface ListContentsInput {
  siteId: string;
  contentType: string;
  includeDraft: boolean;
  limit: number;
  offset: number;
  slug?: string | null;
}

export type ComposableFieldFormatMap = Record<string, "plain" | "richText">;

export interface CreateContentInput {
  slug?: string | null;
  title?: string | null;
  status?: ContentStatus;
  dataJson?: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  /** composable フィールドビルダーの title/text 保存形式（jsonPath -> format）。schema_json へ反映する。 */
  composableFieldFormats?: ComposableFieldFormatMap;
}

export interface UpdateContentInput {
  slug?: string | null;
  title?: string | null;
  status?: ContentStatus;
  dataJson?: Record<string, unknown>;
  updatedBy?: string | null;
  /** composable フィールドビルダーの title/text 保存形式（jsonPath -> format）。schema_json へ反映する。 */
  composableFieldFormats?: ComposableFieldFormatMap;
}

export interface ContentCollectionResult {
  items: ContentRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminContentTypeDefinition {
  slug: string;
  label: string;
  kind: ContentModelType;
  description: string;
  schemaJson: Record<string, unknown>;
}

export interface AdminContentRecord {
  id: string;
  contentType: string;
  siteId: string;
  title: string;
  slug: string;
  status: ContentStatus;
  updatedAt: string;
  author: string;
  summary: string;
  data: Record<string, unknown>;
}

export interface SiteSummary {
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

export interface DashboardSnapshot {
  sites: SiteSummary[];
  recentContents: AdminContentRecord[];
  contentTypes: AdminContentTypeDefinition[];
}
