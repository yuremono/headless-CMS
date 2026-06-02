import 'server-only';

import type { AdminContentTypeDefinition } from '@/lib/content/types';
import {
  dbLoadAssets,
  dbLoadContent,
  dbLoadContents,
  dbLoadContentTypes,
  dbLoadDashboardSnapshot,
  dbLoadSites,
  dbResolveSite,
} from '@/lib/admin/loader';
import { getFieldKey } from './admin-api';
import type {
  AdminLoadMeta,
  AdminLoadResult,
  AssetCollection,
  AssetRecord,
  ContentKind,
  ContentRecord,
  ContentTypeDefinition,
  DashboardSnapshot,
  FieldDefinition,
  FieldKind,
  SiteSummary,
} from './admin-data-types';

export type {
  AdminLoadMeta,
  AdminLoadResult,
  AssetCollection,
  AssetRecord,
  ContentKind,
  ContentRecord,
  ContentSchemaJson,
  ContentTypeDefinition,
  DashboardSnapshot,
  FieldDefinition,
  FieldKind,
  FieldOption,
  SiteSummary,
} from './admin-data-types';
export { siteRouteKey } from './admin-data-utils';

const demoFieldsTopPage: FieldDefinition[] = [
  {
    key: 'title',
    label: 'タイトル',
    type: 'text',
    required: true,
    placeholder: '制作会社のメインメッセージ',
  },
  {
    key: 'lead',
    label: 'リード',
    type: 'textarea',
    rows: 4,
    placeholder: 'サイトの特徴を短く伝える文章',
  },
  {
    key: 'heroImage',
    label: 'ヒーロー画像',
    type: 'image',
    helpText: 'URL または text を入力',
  },
  {
    key: 'heroLink',
    label: 'CTAリンク',
    type: 'url',
    placeholder: 'https://example.com/contact',
  },
  {
    key: 'featured',
    label: '注目表示',
    type: 'boolean',
  },
  {
    key: 'layout',
    label: 'レイアウト',
    type: 'select',
    options: [
      { label: 'フル幅', value: 'full' },
      { label: '左右分割', value: 'split' },
      { label: 'カード', value: 'card' },
    ],
  },
  {
    key: 'body',
    label: '本文',
    type: 'richText',
    rows: 10,
    helpText: 'HTML で入力。CMS 側でサニタイズする前提',
  },
  {
    key: 'sections',
    label: 'セクション配列',
    type: 'sectionArray',
    rows: 8,
    helpText: 'Phase 2 で専用 UI を追加。Phase 1 は JSON テキスト編集で扱う',
  },
];

const demoFieldsPage: FieldDefinition[] = [
  {
    key: 'title',
    label: 'タイトル',
    type: 'text',
    required: true,
    placeholder: '会社概要 / 事業案内など',
  },
  {
    key: 'slug',
    label: 'スラッグ',
    type: 'text',
    required: true,
    placeholder: 'company-profile',
  },
  {
    key: 'summary',
    label: '要約',
    type: 'textarea',
    rows: 3,
  },
  {
    key: 'content',
    label: '本文',
    type: 'richText',
    rows: 12,
  },
  {
    key: 'heroImage',
    label: 'メイン画像',
    type: 'image',
  },
  {
    key: 'showInNavigation',
    label: 'ナビに表示',
    type: 'boolean',
  },
  {
    key: 'sortOrder',
    label: '表示順',
    type: 'number',
  },
  {
    key: 'publishedAt',
    label: '公開日',
    type: 'date',
  },
];

const demoFieldsNews: FieldDefinition[] = [
  {
    key: 'title',
    label: 'タイトル',
    type: 'text',
    required: true,
    placeholder: '新着情報の見出し',
  },
  {
    key: 'slug',
    label: 'スラッグ',
    type: 'text',
    required: true,
  },
  {
    key: 'category',
    label: 'カテゴリ',
    type: 'select',
    options: [
      { label: 'お知らせ', value: 'release' },
      { label: 'ブログ', value: 'blog' },
      { label: 'イベント', value: 'event' },
    ],
  },
  {
    key: 'summary',
    label: '要約',
    type: 'textarea',
    rows: 4,
  },
  {
    key: 'body',
    label: '本文',
    type: 'richText',
    rows: 10,
  },
  {
    key: 'publishedAt',
    label: '公開日',
    type: 'date',
  },
  {
    key: 'coverImage',
    label: '画像',
    type: 'image',
  },
  {
    key: 'pinned',
    label: '固定表示',
    type: 'boolean',
  },
];

export const adminSites: SiteSummary[] = [
  {
    id: 'main-site',
    slug: 'main-site',
    name: 'Main Site',
    domain: 'main-site.example.com',
    description: '制作会社向けの標準構成サイト',
    publishedCount: 18,
    draftCount: 4,
    imageUsage: '72%',
    updatedAt: '2026-05-29T18:30:00+09:00',
  },
  {
    id: 'brand-beta',
    slug: 'brand-beta',
    name: 'Brand Beta',
    domain: 'brand-beta.example.com',
    description: '採用と事業紹介を両立するブランドサイト',
    publishedCount: 26,
    draftCount: 2,
    imageUsage: '64%',
    updatedAt: '2026-05-29T16:10:00+09:00',
  },
];

export const demoAssets: AssetRecord[] = [
  {
    id: 'asset-hero',
    siteId: 'main-site',
    url: 'https://images.example.com/hero-top.jpg',
    filename: 'hero-top.jpg',
    mimeType: 'image/jpeg',
    size: 204800,
    width: 1600,
    height: 900,
    alt: 'トップページのヒーロー画像',
    createdBy: 'Admin',
    createdAt: '2026-05-29T12:00:00+09:00',
  },
  {
    id: 'asset-company',
    siteId: 'main-site',
    url: 'https://images.example.com/company.jpg',
    filename: 'company.jpg',
    mimeType: 'image/jpeg',
    size: 153600,
    width: 1200,
    height: 800,
    alt: '会社概要ページのメイン画像',
    createdBy: 'Editor',
    createdAt: '2026-05-28T15:30:00+09:00',
  },
  {
    id: 'asset-news',
    siteId: 'main-site',
    url: 'https://images.example.com/news-admin.jpg',
    filename: 'news-admin.jpg',
    mimeType: 'image/jpeg',
    size: 98304,
    width: 800,
    height: 600,
    alt: 'Phase 1 公開のお知らせ画像',
    createdBy: 'Admin',
    createdAt: '2026-05-27T10:00:00+09:00',
  },
];

export const contentTypeCatalog: ContentTypeDefinition[] = [
  {
    slug: 'topPage',
    label: 'トップページ',
    kind: 'single',
    description: 'サイトの入り口となる固定ページ',
    schemaJson: {
      fields: demoFieldsTopPage,
      sectionTemplates: ['hero', 'titleGroup', 'textBlock', 'imageText', 'cta'],
    },
  },
  {
    slug: 'page',
    label: '固定ページ',
    kind: 'collection',
    description: '会社概要や事業紹介などの複数ページ',
    schemaJson: {
      fields: demoFieldsPage,
      sectionTemplates: ['titleGroup', 'textBlock', 'imageText'],
    },
  },
  {
    slug: 'news',
    label: 'お知らせ',
    kind: 'collection',
    description: '更新記事やニュースリリース',
    schemaJson: {
      fields: demoFieldsNews,
      sectionTemplates: ['titleGroup', 'textBlock', 'faq', 'newsList'],
    },
  },
];

export const contentRecords: ContentRecord[] = [
  {
    id: 'top-001',
    contentType: 'topPage',
    siteId: 'main-site',
    title: '制作会社向けCMS基盤',
    slug: 'top',
    status: 'published',
    updatedAt: '2026-05-29T19:00:00+09:00',
    author: 'Admin',
    summary: 'スキーマ駆動の管理画面を中心に据えたトップページ',
    data: {
      title: '制作会社向けCMS基盤',
      lead: '構造化データだけを扱うヘッドレス CMS',
      heroImage: 'https://images.example.com/hero-top.jpg',
      heroLink: 'https://alpha.example.com/contact',
      featured: true,
      layout: 'split',
      body: '<p>コンテンツ作成・編集・公開に集中できる管理画面です。</p>',
      sections: '{"type":"hero","id":"sec_hero_001","data":{}}',
    },
  },
  {
    id: 'page-001',
    contentType: 'page',
    siteId: 'main-site',
    title: '会社概要',
    slug: 'company',
    status: 'published',
    updatedAt: '2026-05-29T17:30:00+09:00',
    author: 'Editor',
    summary: '会社の基本情報と方針をまとめた固定ページ',
    data: {
      title: '会社概要',
      slug: 'company',
      summary: '会社の基本情報と方針をまとめた固定ページ',
      content: '<p>私たちは制作会社向けの CMS を提供します。</p>',
      heroImage: 'https://images.example.com/company.jpg',
      showInNavigation: true,
      sortOrder: 10,
      publishedAt: '2026-05-28',
    },
  },
  {
    id: 'page-002',
    contentType: 'page',
    siteId: 'main-site',
    title: '事業案内',
    slug: 'services',
    status: 'draft',
    updatedAt: '2026-05-29T17:45:00+09:00',
    author: 'Editor',
    summary: '提供サービスの一覧',
    data: {
      title: '事業案内',
      slug: 'services',
      summary: '提供サービスの一覧',
      content: '<p>Web 制作と運用保守をサポートします。</p>',
      heroImage: 'https://images.example.com/services.jpg',
      showInNavigation: true,
      sortOrder: 20,
      publishedAt: '2026-05-29',
    },
  },
  {
    id: 'news-001',
    contentType: 'news',
    siteId: 'main-site',
    title: 'Phase 1 管理画面を公開',
    slug: 'phase1-admin',
    status: 'published',
    updatedAt: '2026-05-29T18:15:00+09:00',
    author: 'Admin',
    summary: '編集画面の骨格とスキーマ駆動フォームを追加',
    data: {
      title: 'Phase 1 管理画面を公開',
      slug: 'phase1-admin',
      category: 'release',
      summary: '編集画面の骨格とスキーマ駆動フォームを追加',
      body: '<p>ログイン、ダッシュボード、一覧、編集フォームを実装しました。</p>',
      publishedAt: '2026-05-29',
      coverImage: 'https://images.example.com/news-admin.jpg',
      pinned: true,
    },
  },
  {
    id: 'news-002',
    contentType: 'news',
    siteId: 'main-site',
    title: 'API 接続の確認',
    slug: 'api-check',
    status: 'draft',
    updatedAt: '2026-05-29T18:45:00+09:00',
    author: 'Editor',
    summary: '管理 API の fetch 接続を検証中',
    data: {
      title: 'API 接続の確認',
      slug: 'api-check',
      category: 'blog',
      summary: '管理 API の fetch 接続を検証中',
      body: '<p>API エージェント側の実装に合わせて接続します。</p>',
      publishedAt: '2026-05-30',
      coverImage: 'https://images.example.com/news-api.jpg',
      pinned: false,
    },
  },
  {
    id: 'top-002',
    contentType: 'topPage',
    siteId: 'brand-beta',
    title: 'Brand Beta トップ',
    slug: 'top',
    status: 'draft',
    updatedAt: '2026-05-29T16:45:00+09:00',
    author: 'Admin',
    summary: 'ブランド向けのシンプルなトップページ',
    data: {
      title: 'Brand Beta トップ',
      lead: '採用と事業紹介を両立するサイト',
      heroImage: 'https://images.example.com/brand-top.jpg',
      heroLink: 'https://beta.example.com/contact',
      featured: false,
      layout: 'full',
      body: '<p>ブランド訴求と採用導線を両立します。</p>',
      sections: '{"type":"cta","id":"sec_cta_001","data":{}}',
    },
  },
];

function isFieldKind(value: string): value is FieldKind {
  return [
    'text',
    'textarea',
    'richText',
    'number',
    'boolean',
    'url',
    'date',
    'select',
    'image',
    'sectionArray',
  ].includes(value);
}

function mapSchemaField(field: unknown, prefix = ''): FieldDefinition | null {
  if (!field || typeof field !== 'object') {
    return null;
  }

  const raw = field as Record<string, unknown>;
  const name = getFieldKey(raw);
  const type = String(raw.type ?? 'text');
  const key = prefix ? `${prefix}.${name}` : name;

  if (!name) {
    return null;
  }

  if (type === 'object' && Array.isArray(raw.fields)) {
    return null;
  }

  if (type === 'array' || type === 'reference') {
    return null;
  }

  if (!isFieldKind(type)) {
    return null;
  }

  return {
    key,
    label: String(raw.label ?? name),
    type,
    required: Boolean(raw.required),
    placeholder: typeof raw.placeholder === 'string' ? raw.placeholder : undefined,
    helpText:
      typeof raw.helpText === 'string'
        ? raw.helpText
        : typeof raw.description === 'string'
          ? raw.description
          : undefined,
    rows: typeof raw.rows === 'number' ? raw.rows : undefined,
    options: Array.isArray(raw.options)
      ? raw.options
          .filter((option): option is { label: string; value: string } => {
            return Boolean(option && typeof option === 'object' && 'label' in option && 'value' in option);
          })
          .map((option) => ({ label: String(option.label), value: String(option.value) }))
      : undefined,
  };
}

function flattenSchemaFields(rawFields: unknown[], prefix = ''): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  for (const item of rawFields) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const raw = item as Record<string, unknown>;
    const name = getFieldKey(raw);
    const type = String(raw.type ?? 'text');
    const key = prefix ? `${prefix}.${name}` : name;

    if (!name) {
      continue;
    }

    if (type === 'object' && Array.isArray(raw.fields)) {
      fields.push(...flattenSchemaFields(raw.fields, key));
      continue;
    }

    const mapped = mapSchemaField(item, prefix);
    if (mapped) {
      fields.push(mapped);
    }
  }

  return fields;
}

function extractSectionTemplates(schemaJson: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(schemaJson.sectionTemplates)) {
    return schemaJson.sectionTemplates.map(String);
  }

  if (Array.isArray(schemaJson.sections)) {
    return schemaJson.sections
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => String(item.type ?? item.name ?? ''))
      .filter(Boolean);
  }

  return undefined;
}

function mapSchemaJsonToContentType(input: {
  slug: string;
  label: string;
  kind: ContentKind;
  description: string;
  schemaJson: Record<string, unknown>;
}): ContentTypeDefinition {
  const rawFields = Array.isArray(input.schemaJson.fields) ? input.schemaJson.fields : [];

  return {
    slug: input.slug,
    label: input.label,
    kind: input.kind,
    description: input.description,
    schemaJson: {
      fields: flattenSchemaFields(rawFields),
      sectionTemplates: extractSectionTemplates(input.schemaJson),
    },
  };
}

function mapDbContentTypeDefinition(record: AdminContentTypeDefinition): ContentTypeDefinition {
  return mapSchemaJsonToContentType({
    slug: record.slug,
    label: record.label,
    kind: record.kind,
    description: record.description,
    schemaJson: record.schemaJson,
  });
}

function mapDbContentRecord(record: import('@/lib/content/types').AdminContentRecord): ContentRecord {
  return {
    id: record.id,
    contentType: record.contentType,
    siteId: record.siteId,
    title: record.title,
    slug: record.slug,
    status: record.status,
    updatedAt: record.updatedAt,
    author: record.author,
    summary: record.summary,
    data: record.data,
  };
}

function mapDbSiteSummary(site: import('@/lib/content/types').SiteSummary): SiteSummary {
  return {
    id: site.id,
    slug: site.slug,
    name: site.name,
    domain: site.domain,
    description: site.description,
    publishedCount: site.publishedCount,
    draftCount: site.draftCount,
    imageUsage: site.imageUsage,
    updatedAt: site.updatedAt,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function demoResult<T>(data: T, endpoint: string, error?: string): AdminLoadResult<T> {
  return {
    data: clone(data),
    meta: {
      source: 'demo',
      error,
      endpoint,
    },
  };
}

function apiResult<T>(data: T, endpoint: string): AdminLoadResult<T> {
  return {
    data,
    meta: {
      source: 'api',
      endpoint,
    },
  };
}

function contentTypesEndpoint(siteId: string) {
  return `/api/admin/sites/${siteId}/content-types`;
}

function contentsEndpoint(siteId: string, contentType: string) {
  return `/api/admin/sites/${siteId}/content/${contentType}`;
}

function contentEndpoint(siteId: string, contentType: string, id: string) {
  return `/api/admin/sites/${siteId}/content/${contentType}/${id}`;
}

function assetsEndpoint(siteId: string) {
  return `/api/admin/sites/${siteId}/assets`;
}

function dashboardEndpoint() {
  return '/api/admin/dashboard';
}

function sitesEndpoint() {
  return '/api/admin/sites';
}

function matchesDemoSite(recordSiteId: string, siteIdOrSlug: string) {
  return recordSiteId === siteIdOrSlug || adminSites.some((site) => site.id === recordSiteId && site.slug === siteIdOrSlug);
}

export async function loadAssets(siteId: string): Promise<AdminLoadResult<AssetCollection>> {
  const endpoint = assetsEndpoint(siteId);
  const fromDb = await dbLoadAssets(siteId);

  if (fromDb) {
    return apiResult(fromDb, endpoint);
  }

  const filtered = demoAssets.filter((asset) => matchesDemoSite(asset.siteId, siteId));

  return demoResult(
    {
      items: filtered,
      total: filtered.length,
      limit: 50,
      offset: 0,
    },
    endpoint,
    'DB 未接続のためデモアセットを表示しています。',
  );
}

export async function loadAdminSites(): Promise<AdminLoadResult<SiteSummary[]>> {
  const endpoint = sitesEndpoint();
  const fromDb = await dbLoadSites();

  if (fromDb) {
    return apiResult(fromDb.map(mapDbSiteSummary), endpoint);
  }

  return demoResult(adminSites, endpoint, 'DB 未接続のためデモデータを使用しています。');
}

export async function loadDashboardSnapshot(siteId = adminSites[0]?.slug ?? 'main-site'): Promise<
  AdminLoadResult<DashboardSnapshot>
> {
  const endpoint = dashboardEndpoint();
  const fromDb = await dbLoadDashboardSnapshot(siteId);

  if (fromDb) {
    return apiResult(
      {
        sites: fromDb.sites.map(mapDbSiteSummary),
        recentContents: fromDb.recentContents.map(mapDbContentRecord),
        contentTypes: fromDb.contentTypes.map(mapDbContentTypeDefinition),
      },
      endpoint,
    );
  }

  const [contentTypesResult, pageContents, newsContents, topPageContents] = await Promise.all([
    loadContentTypes(siteId),
    loadContents(siteId, 'page'),
    loadContents(siteId, 'news'),
    loadContents(siteId, 'topPage'),
  ]);

  const recentContents = [...topPageContents.data, ...pageContents.data, ...newsContents.data]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);

  const usesDemo =
    contentTypesResult.meta.source === 'demo' ||
    pageContents.meta.source === 'demo' ||
    newsContents.meta.source === 'demo';

  const errorMessages = [contentTypesResult.meta.error, pageContents.meta.error, newsContents.meta.error]
    .filter(Boolean)
    .join(' / ');

  return {
    data: {
      sites: adminSites,
      recentContents,
      contentTypes: contentTypesResult.data,
    },
    meta: {
      source: usesDemo ? 'demo' : 'api',
      error: errorMessages || undefined,
      endpoint,
    },
  };
}

export async function loadContentTypes(siteId: string): Promise<AdminLoadResult<ContentTypeDefinition[]>> {
  const endpoint = contentTypesEndpoint(siteId);
  const fromDb = await dbLoadContentTypes(siteId);

  if (fromDb) {
    return apiResult(fromDb.map(mapDbContentTypeDefinition), endpoint);
  }

  return demoResult(contentTypeCatalog, endpoint, 'DB 未接続のためデモ定義を表示しています。');
}

export async function loadContents(siteId: string, contentType: string): Promise<AdminLoadResult<ContentRecord[]>> {
  const endpoint = contentsEndpoint(siteId, contentType);
  const fromDb = await dbLoadContents(siteId, contentType);

  if (fromDb) {
    return apiResult(fromDb.map(mapDbContentRecord), endpoint);
  }

  const filtered = contentRecords.filter(
    (record) => matchesDemoSite(record.siteId, siteId) && record.contentType === contentType,
  );
  return demoResult(filtered, endpoint, 'DB 未接続のためデモデータを表示しています。');
}

export async function loadContent(
  siteId: string,
  contentType: string,
  id: string,
): Promise<AdminLoadResult<ContentRecord | null>> {
  const endpoint = contentEndpoint(siteId, contentType, id);
  const fromDb = await dbLoadContent(siteId, contentType, id);

  if (fromDb) {
    return apiResult(mapDbContentRecord(fromDb), endpoint);
  }

  const fallback =
    contentRecords.find(
      (record) => matchesDemoSite(record.siteId, siteId) && record.contentType === contentType && record.id === id,
    ) ?? null;

  return demoResult(fallback, endpoint, 'DB 未接続のためデモデータを表示しています。');
}

export async function resolveContentTypeDefinition(
  siteId: string,
  contentType: string,
): Promise<AdminLoadResult<ContentTypeDefinition | null>> {
  const loaded = await loadContentTypes(siteId);
  const match = loaded.data.find((item) => item.slug === contentType) ?? getContentTypeDefinition(contentType);

  return {
    data: match,
    meta: loaded.meta,
  };
}

export function getContentTypeDefinition(contentType: string) {
  return contentTypeCatalog.find((item) => item.slug === contentType) ?? null;
}

export function getSiteDefinition(siteIdOrSlug: string) {
  return adminSites.find((site) => site.id === siteIdOrSlug || site.slug === siteIdOrSlug) ?? null;
}

export async function resolveSiteSummary(siteIdOrSlug: string): Promise<SiteSummary | null> {
  const fromDb = await dbResolveSite(siteIdOrSlug);
  if (fromDb) {
    return mapDbSiteSummary(fromDb);
  }

  return getSiteDefinition(siteIdOrSlug);
}

export function getContentTypeCount(siteId: string, contentType: string) {
  return contentRecords.filter((record) => record.siteId === siteId && record.contentType === contentType).length;
}

export function getRecentUpdatedAt(contents: ContentRecord[]) {
  return contents.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export const adminDemoCredentials = {
  email: process.env.ADMIN_DEMO_EMAIL ?? 'admin@example.com',
};
