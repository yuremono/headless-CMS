export type ContentKind = 'single' | 'collection';
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'richText'
  | 'number'
  | 'boolean'
  | 'url'
  | 'date'
  | 'select'
  | 'image'
  | 'sectionArray';

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldKind;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  rows?: number;
  options?: FieldOption[];
}

export interface ContentSchemaJson {
  fields: FieldDefinition[];
  sectionTemplates?: string[];
}

export interface ContentTypeDefinition {
  slug: string;
  label: string;
  kind: ContentKind;
  description: string;
  schemaJson: ContentSchemaJson;
}

export interface ContentRecord {
  id: string;
  contentType: string;
  siteId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'unpublished';
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
  recentContents: ContentRecord[];
  contentTypes: ContentTypeDefinition[];
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

export interface AssetCollection {
  items: AssetRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminLoadMeta {
  source: 'api' | 'demo';
  error?: string;
  endpoint?: string;
}

export interface AdminLoadResult<T> {
  data: T;
  meta: AdminLoadMeta;
}
