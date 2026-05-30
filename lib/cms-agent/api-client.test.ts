import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildContentWriteBody, createCmsAgentClient } from './api-client';
import type { AssetRecord, ContentRecord, FieldManifest } from './types';

const MOCK_BASE_URL = 'http://localhost:3000';
const MOCK_API_KEY = 'test-api-key';

const MOCK_CONTENT_RECORD: ContentRecord = {
  id: 'cid-001',
  siteId: 'site-001',
  contentType: 'topPage',
  slug: 'top',
  title: 'Top Page',
  status: 'draft',
  dataJson: { hero: { title: 'Hello' } },
  createdBy: null,
  updatedBy: null,
  publishedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function mockFetchJson(data: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(data)),
    }),
  );
}

function mockFetchError(message: string): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createCmsAgentClient', () => {
  describe('getContent', () => {
    it('GET /api/admin/sites/{siteId}/content/{contentType}/{id} を呼ぶ', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const result = await client.getContent('site-001', 'topPage', 'cid-001');

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(MOCK_CONTENT_RECORD);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/sites/site-001/content/topPage/cid-001',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('x-api-key ヘッダーを付与する', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      await client.getContent('site-001', 'topPage', 'cid-001');

      const call = vi.mocked(fetch).mock.calls[0];
      const headers = new Headers(call?.[1]?.headers as HeadersInit);
      expect(headers.get('x-api-key')).toBe(MOCK_API_KEY);
    });

    it('403 レスポンスを ok:false で返す', async () => {
      mockFetchJson({ error: 'API key is invalid.', code: 'invalid_api_key' }, 403);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: 'bad-key' });
      const result = await client.getContent('site-001', 'topPage', 'cid-001');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toBe('API key is invalid.');
      expect(result.code).toBe('invalid_api_key');
    });

    it('404 レスポンスを ok:false で返す', async () => {
      mockFetchJson({ error: 'Content not found.', code: 'content_not_found' }, 404);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const result = await client.getContent('site-001', 'topPage', 'missing');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.code).toBe('content_not_found');
    });

    it('ネットワークエラーを ok:false / code:network_error で返す', async () => {
      mockFetchError('fetch failed');
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const result = await client.getContent('site-001', 'topPage', 'cid-001');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(0);
      expect(result.code).toBe('network_error');
      expect(result.error).toBe('fetch failed');
    });

    it('不正 JSON レスポンスを ok:false / code:invalid_json で返す', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: () => Promise.resolve('{not json}'),
        }),
      );
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const result = await client.getContent('site-001', 'topPage', 'cid-001');

      expect(result.ok).toBe(false);
      expect(result.code).toBe('invalid_json');
    });
  });

  describe('patchContent', () => {
    it('PATCH エンドポイントに buildContentWriteBody 形式で送信する', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const input = {
        title: 'Top Page',
        slug: 'top',
        data: { hero: { title: 'Updated' } },
        status: 'draft' as const,
        fieldFormats: { 'hero.title': 'plain' as const },
      };
      const result = await client.patchContent('site-001', 'topPage', 'cid-001', input);

      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/sites/site-001/content/topPage/cid-001',
        expect.objectContaining({ method: 'PATCH' }),
      );

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string) as unknown;
      expect(body).toEqual({
        title: 'Top Page',
        slug: 'top',
        status: 'draft',
        data: { hero: { title: 'Updated' } },
        fieldFormats: { 'hero.title': 'plain' },
      });
    });

    it('fieldFormats が未指定のときボディに含めない', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      await client.patchContent('site-001', 'topPage', 'cid-001', {
        title: 'T',
        slug: 's',
        data: {},
      });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string) as unknown;
      expect(body).not.toHaveProperty('fieldFormats');
    });

    it('status 未指定時はデフォルト draft', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      await client.patchContent('site-001', 'topPage', 'cid-001', {
        title: 'T',
        slug: 's',
        data: {},
      });

      const call = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string) as Record<string, unknown>;
      expect(body['status']).toBe('draft');
    });

    it('Content-Type: application/json ヘッダーを付与する', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      await client.patchContent('site-001', 'topPage', 'cid-001', { title: 'T', slug: 's', data: {} });

      const call = vi.mocked(fetch).mock.calls[0];
      const headers = new Headers(call?.[1]?.headers as HeadersInit);
      expect(headers.get('content-type')).toBe('application/json');
    });
  });

  describe('publishContent', () => {
    it('POST .../publish を呼ぶ', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const result = await client.publishContent('site-001', 'topPage', 'cid-001');

      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/sites/site-001/content/topPage/cid-001/publish',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('publish エラーを ok:false で返す', async () => {
      mockFetchJson({ error: 'Not found.', code: 'content_not_found' }, 404);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const result = await client.publishContent('site-001', 'topPage', 'missing');

      expect(result.ok).toBe(false);
      expect(result.code).toBe('content_not_found');
    });
  });

  describe('uploadAsset', () => {
    const MOCK_ASSET: AssetRecord = {
      id: 'asset-001',
      siteId: 'site-001',
      url: 'https://example.com/photo.jpg',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      width: 800,
      height: 600,
      alt: 'A photo',
      createdBy: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    it('multipart FormData で POST .../assets を呼ぶ', async () => {
      mockFetchJson(MOCK_ASSET, 201);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const blob = new Blob(['data'], { type: 'image/jpeg' });
      const result = await client.uploadAsset('site-001', blob, { alt: 'A photo', filename: 'photo.jpg' });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(201);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/sites/site-001/assets',
        expect.objectContaining({ method: 'POST' }),
      );

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call?.[1]?.body).toBeInstanceOf(FormData);
    });

    it('File オブジェクトのファイル名をそのまま使う', async () => {
      mockFetchJson(MOCK_ASSET, 201);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const file = new File(['data'], 'banner.png', { type: 'image/png' });
      await client.uploadAsset('site-001', file);

      const call = vi.mocked(fetch).mock.calls[0];
      const form = call?.[1]?.body as FormData;
      const fileEntry = form.get('file');
      expect(fileEntry instanceof File ? fileEntry.name : '').toBe('banner.png');
    });
  });

  describe('getContentManifest', () => {
    const MOCK_MANIFEST: FieldManifest = {
      siteId: 'site-001',
      contentType: 'topPage',
      paths: [{ path: 'hero.title', type: 'title', format: 'plain' }],
    };

    it('GET .../manifest を呼ぶ', async () => {
      mockFetchJson(MOCK_MANIFEST);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      const result = await client.getContentManifest('site-001', 'topPage');

      expect(result.ok).toBe(true);
      expect(result.data?.contentType).toBe('topPage');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/admin/sites/site-001/content/topPage/manifest',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('id オプションをクエリパラメータとして付与する', async () => {
      mockFetchJson(MOCK_MANIFEST);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      await client.getContentManifest('site-001', 'topPage', { id: 'cid-001' });

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call?.[0] as string).toContain('?id=cid-001');
    });

    it('id 未指定のときクエリ文字列を付けない', async () => {
      mockFetchJson(MOCK_MANIFEST);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL, apiKey: MOCK_API_KEY });
      await client.getContentManifest('site-001', 'topPage');

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call?.[0] as string).not.toContain('?');
    });
  });

  describe('ベース URL のトレーリングスラッシュ正規化', () => {
    it('末尾スラッシュ付き baseUrl でも正常に URL を組み立てる', async () => {
      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: 'http://localhost:3000/', apiKey: MOCK_API_KEY });
      await client.getContent('s', 't', 'i');

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call?.[0] as string).toBe('http://localhost:3000/api/admin/sites/s/content/t/i');
    });
  });

  describe('環境変数によるデフォルト設定', () => {
    it('CMS_ADMIN_API_KEY が未設定なら admin-dev-key を使う', async () => {
      const saved = process.env['CMS_ADMIN_API_KEY'];
      delete process.env['CMS_ADMIN_API_KEY'];

      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ baseUrl: MOCK_BASE_URL });
      await client.getContent('s', 't', 'i');

      const call = vi.mocked(fetch).mock.calls[0];
      const headers = new Headers(call?.[1]?.headers as HeadersInit);
      expect(headers.get('x-api-key')).toBe('admin-dev-key');

      if (saved !== undefined) {
        process.env['CMS_ADMIN_API_KEY'] = saved;
      }
    });

    it('CMS_BASE_URL 環境変数でベース URL を上書きできる', async () => {
      const saved = process.env['CMS_BASE_URL'];
      process.env['CMS_BASE_URL'] = 'https://0529headless-cms.vercel.app';

      mockFetchJson(MOCK_CONTENT_RECORD);
      const client = createCmsAgentClient({ apiKey: MOCK_API_KEY });
      await client.getContent('s', 't', 'i');

      const call = vi.mocked(fetch).mock.calls[0];
      expect((call?.[0] as string).startsWith('https://0529headless-cms.vercel.app')).toBe(true);

      process.env['CMS_BASE_URL'] = saved;
    });
  });
});

describe('buildContentWriteBody', () => {
  it('title / slug / data / status を含む', () => {
    const result = buildContentWriteBody({
      title: 'My Page',
      slug: 'my-page',
      data: { key: 'value' },
      status: 'published',
    });

    expect(result).toEqual({
      title: 'My Page',
      slug: 'my-page',
      status: 'published',
      data: { key: 'value' },
    });
  });

  it('status 未指定時は draft', () => {
    const result = buildContentWriteBody({ title: 'T', slug: 's', data: {} });
    expect(result.status).toBe('draft');
  });

  it('fieldFormats が指定されればボディに含む', () => {
    const result = buildContentWriteBody({
      title: 'T',
      slug: 's',
      data: {},
      fieldFormats: { 'hero.title': 'richText' },
    });
    expect(result.fieldFormats).toEqual({ 'hero.title': 'richText' });
  });

  it('fieldFormats が未指定ならキーを含まない', () => {
    const result = buildContentWriteBody({ title: 'T', slug: 's', data: {} });
    expect(result).not.toHaveProperty('fieldFormats');
  });
});
