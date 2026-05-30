import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CmsAgentError,
  loadDeveloperContent,
  mergeDataForSave,
  publishContent,
  saveDraft,
  writeFieldValue,
  type ComposableFieldGroup,
} from './content-ops';

const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error, code }), { status });
}

const BASE_CONTENT: Record<string, unknown> = {
  id: 'c1',
  siteId: 'site1',
  contentType: 'topPage',
  title: 'Top Page',
  slug: 'top-page',
  status: 'draft',
  data: { hero: { title: 'Hello', text: 'World' } },
  updatedAt: '2025-01-01T00:00:00.000Z',
  publishedAt: null,
};

const BASE_CONTENT_PATCH: Record<string, unknown> = {
  ...BASE_CONTENT,
  dataJson: BASE_CONTENT['data'],
};
delete (BASE_CONTENT_PATCH as Record<string, unknown>)['data'];

const SCHEMAS: unknown[] = [
  {
    apiName: 'topPage',
    schemaJson: {
      composableFieldFormats: {
        'hero.title': 'richText',
        'hero.text': 'plain',
      },
    },
  },
];

describe('loadDeveloperContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches content and schemas in parallel and returns snapshot', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(BASE_CONTENT))
      .mockResolvedValueOnce(jsonResponse(SCHEMAS));

    const result = await loadDeveloperContent('site1', 'topPage', 'c1');

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const [contentCall, schemasCall] = mockFetch.mock.calls;
    expect(String(contentCall![0])).toContain('/api/admin/sites/site1/content/topPage/c1');
    expect(String(schemasCall![0])).toContain('/api/admin/sites/site1/schemas');

    expect(result.id).toBe('c1');
    expect(result.siteId).toBe('site1');
    expect(result.contentType).toBe('topPage');
    expect(result.title).toBe('Top Page');
    expect(result.slug).toBe('top-page');
    expect(result.status).toBe('draft');
    expect(result.data).toEqual({ hero: { title: 'Hello', text: 'World' } });
    expect(result.fieldFormats).toEqual({
      'hero.title': 'richText',
      'hero.text': 'plain',
    });
    expect(result.updatedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result.publishedAt).toBeNull();
  });

  it('returns empty fieldFormats when schema has no composableFieldFormats', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(BASE_CONTENT))
      .mockResolvedValueOnce(jsonResponse([{ apiName: 'topPage', schemaJson: {} }]));

    const result = await loadDeveloperContent('site1', 'topPage', 'c1');
    expect(result.fieldFormats).toEqual({});
  });

  it('returns empty fieldFormats when schema list is empty', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(BASE_CONTENT))
      .mockResolvedValueOnce(jsonResponse([]));

    const result = await loadDeveloperContent('site1', 'topPage', 'c1');
    expect(result.fieldFormats).toEqual({});
  });

  it('sends x-api-key header when apiKey option is set', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(BASE_CONTENT))
      .mockResolvedValueOnce(jsonResponse(SCHEMAS));

    await loadDeveloperContent('site1', 'topPage', 'c1', { apiKey: 'test-key' });

    for (const [, init] of mockFetch.mock.calls) {
      const headers = new Headers(init?.headers as HeadersInit);
      expect(headers.get('x-api-key')).toBe('test-key');
    }
  });

  it('prepends baseUrl to request paths', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(BASE_CONTENT))
      .mockResolvedValueOnce(jsonResponse(SCHEMAS));

    await loadDeveloperContent('site1', 'topPage', 'c1', {
      baseUrl: 'https://cms.example.com',
    });

    const [contentCall] = mockFetch.mock.calls;
    expect(String(contentCall![0])).toMatch(/^https:\/\/cms\.example\.com\//);
  });

  it('throws CmsAgentError on 404', async () => {
    // Promise.all fires both requests; each needs its own Response instance
    mockFetch
      .mockResolvedValueOnce(errorResponse(404, 'Content not found.', 'content_not_found'))
      .mockResolvedValueOnce(jsonResponse([]));

    await expect(loadDeveloperContent('site1', 'topPage', 'missing')).rejects.toBeInstanceOf(
      CmsAgentError,
    );
  });

  it('throws CmsAgentError on network failure', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(SCHEMAS));

    await expect(loadDeveloperContent('site1', 'topPage', 'c1')).rejects.toBeInstanceOf(
      CmsAgentError,
    );
  });

  it('CmsAgentError carries status and code', async () => {
    // Each parallel fetch needs its own Response instance; content fails, schemas succeeds
    mockFetch
      .mockResolvedValueOnce(errorResponse(403, 'Forbidden', 'insufficient_permission'))
      .mockResolvedValueOnce(jsonResponse([]));

    let caught: unknown;
    try {
      await loadDeveloperContent('site1', 'topPage', 'c1');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CmsAgentError);
    const err = caught as CmsAgentError;
    expect(err.status).toBe(403);
    expect(err.code).toBe('insufficient_permission');
    expect(err.message).toBe('Forbidden');
  });
});

describe('saveDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends PATCH with status=draft and returns snapshot', async () => {
    const patchResponse = { ...BASE_CONTENT_PATCH, status: 'draft' };
    mockFetch.mockResolvedValueOnce(jsonResponse(patchResponse));

    const result = await saveDraft({
      siteId: 'site1',
      contentType: 'topPage',
      id: 'c1',
      data: { hero: { title: 'Updated' } },
      fieldFormats: { 'hero.title': 'richText' },
      title: 'Top Page',
      slug: 'top-page',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0]!;
    expect(String(url)).toContain('/api/admin/sites/site1/content/topPage/c1');
    expect(init!.method).toBe('PATCH');

    const body = JSON.parse(init!.body as string) as Record<string, unknown>;
    expect(body['status']).toBe('draft');
    expect(body['data']).toEqual({ hero: { title: 'Updated' } });
    expect(body['fieldFormats']).toEqual({ 'hero.title': 'richText' });

    expect(result.status).toBe('draft');
    expect(result.fieldFormats).toEqual({ 'hero.title': 'richText' });
  });

  it('omits fieldFormats from body when not provided', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(BASE_CONTENT_PATCH));

    await saveDraft({
      siteId: 'site1',
      contentType: 'topPage',
      id: 'c1',
      data: {},
    });

    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(init!.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('fieldFormats');
  });

  it('throws CmsAgentError on non-2xx response', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, 'Content update failed.', 'content_update_failed'));

    await expect(
      saveDraft({ siteId: 'site1', contentType: 'topPage', id: 'c1', data: {} }),
    ).rejects.toBeInstanceOf(CmsAgentError);
  });
});

describe('publishContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends PATCH then POST to publish endpoint', async () => {
    const publishedRecord = { ...BASE_CONTENT_PATCH, status: 'published', publishedAt: '2025-06-01T00:00:00.000Z' };
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ ...BASE_CONTENT_PATCH, status: 'published' }))
      .mockResolvedValueOnce(jsonResponse(publishedRecord));

    const result = await publishContent({
      siteId: 'site1',
      contentType: 'topPage',
      id: 'c1',
      data: { hero: { title: 'Live' } },
      title: 'Top Page',
      slug: 'top-page',
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const [patchUrl, patchInit] = mockFetch.mock.calls[0]!;
    expect(String(patchUrl)).toContain('/api/admin/sites/site1/content/topPage/c1');
    expect(patchInit!.method).toBe('PATCH');

    const [publishUrl, publishInit] = mockFetch.mock.calls[1]!;
    expect(String(publishUrl)).toContain('/api/admin/sites/site1/content/topPage/c1/publish');
    expect(publishInit!.method).toBe('POST');

    expect(result.status).toBe('published');
    expect(result.publishedAt).toBe('2025-06-01T00:00:00.000Z');
  });

  it('uses published status in PATCH body', async () => {
    const published = { ...BASE_CONTENT_PATCH, status: 'published' };
    mockFetch
      .mockResolvedValueOnce(jsonResponse(published))
      .mockResolvedValueOnce(jsonResponse(published));

    await publishContent({
      siteId: 'site1',
      contentType: 'topPage',
      id: 'c1',
      data: {},
    });

    const [, patchInit] = mockFetch.mock.calls[0]!;
    const body = JSON.parse(patchInit!.body as string) as Record<string, unknown>;
    expect(body['status']).toBe('published');
  });

  it('throws CmsAgentError if PATCH fails (before publish POST)', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(422, 'Validation error', 'validation_error'));

    await expect(
      publishContent({ siteId: 'site1', contentType: 'topPage', id: 'c1', data: {} }),
    ).rejects.toBeInstanceOf(CmsAgentError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('mergeDataForSave', () => {
  it('writes non-repeatable field values into the base data', () => {
    const baseData = { hero: { title: 'Old', text: 'Old text' }, other: 'keep' };
    const groups: ComposableFieldGroup[] = [
      {
        id: 'g1',
        prefix: 'hero',
        fields: [
          { type: 'title', suffix: 'title', jsonPath: 'hero.title', value: 'New Title' },
          { type: 'text', suffix: 'text', jsonPath: 'hero.text', value: 'New Text' },
        ],
      },
    ];

    const result = mergeDataForSave(baseData, groups);

    expect(result).toEqual({
      hero: { title: 'New Title', text: 'New Text' },
      other: 'keep',
    });
  });

  it('builds repeatable array value from items', () => {
    const groups: ComposableFieldGroup[] = [
      {
        id: 'g1',
        prefix: 'cards',
        repeatable: true,
        fields: [
          { type: 'title', suffix: 'title', jsonPath: 'cards.title', value: '' },
        ],
        items: [
          {
            id: 'item0',
            fields: [
              { type: 'title', suffix: 'title', jsonPath: 'cards.0.title', value: 'Card 1' },
            ],
          },
          {
            id: 'item1',
            fields: [
              { type: 'title', suffix: 'title', jsonPath: 'cards.1.title', value: 'Card 2' },
            ],
          },
        ],
      },
    ];

    const result = mergeDataForSave({}, groups);

    expect(result['cards']).toEqual([{ title: 'Card 1' }, { title: 'Card 2' }]);
  });

  it('does not mutate the original baseData', () => {
    const baseData = { hero: { title: 'Original' } };
    const groups: ComposableFieldGroup[] = [
      {
        id: 'g1',
        prefix: 'hero',
        fields: [{ type: 'title', suffix: 'title', jsonPath: 'hero.title', value: 'Changed' }],
      },
    ];

    mergeDataForSave(baseData, groups);

    expect(baseData.hero.title).toBe('Original');
  });

  it('skips repeatable group with empty prefix', () => {
    const groups: ComposableFieldGroup[] = [
      {
        id: 'g1',
        prefix: '  ',
        repeatable: true,
        fields: [],
        items: [{ id: 'item0', fields: [] }],
      },
    ];

    const result = mergeDataForSave({}, groups);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('writeFieldValue', () => {
  it('sets a top-level key', () => {
    const data: Record<string, unknown> = {};
    writeFieldValue(data, 'title', 'Hello');
    expect(data).toEqual({ title: 'Hello' });
  });

  it('creates nested objects for dotted paths', () => {
    const data: Record<string, unknown> = {};
    writeFieldValue(data, 'hero.title', 'Hero Title');
    expect(data).toEqual({ hero: { title: 'Hero Title' } });
  });

  it('writes into an array element via numeric segment', () => {
    const data: Record<string, unknown> = { cards: [{}, {}] };
    writeFieldValue(data, 'cards.1.title', 'Card 2');
    expect((data['cards'] as Record<string, unknown>[])[1]).toEqual({ title: 'Card 2' });
  });

  it('overwrites existing values', () => {
    const data: Record<string, unknown> = { hero: { title: 'Old' } };
    writeFieldValue(data, 'hero.title', 'New');
    expect((data['hero'] as Record<string, unknown>)['title']).toBe('New');
  });
});
