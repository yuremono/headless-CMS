import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveDeliveryRequest: vi.fn(),
  getDeliveryContent: vi.fn(),
}));

import { getDeliveryContent, resolveDeliveryRequest } from "@/lib/content/service";

const mockedResolveDeliveryRequest = vi.mocked(resolveDeliveryRequest);
const mockedGetDeliveryContent = vi.mocked(getDeliveryContent);

describe("GET /api/sites/[siteId]/content/[contentType]/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証失敗時はエラーレスポンスを返す", async () => {
    mockedResolveDeliveryRequest.mockResolvedValue({
      auth: {
        ok: false,
        failure: { status: 403, code: "invalid_api_key", error: "API key is invalid." },
      },
      includeDraft: false,
    });

    const response = await GET(
      new Request("https://example.com/api/sites/site-1/content/news/content-1"),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "content-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mockedGetDeliveryContent).not.toHaveBeenCalled();
  });

  it("コンテンツが無い場合は 404 を返す", async () => {
    mockedResolveDeliveryRequest.mockResolvedValue({
      auth: {
        ok: true,
        context: {
          mode: "public",
          siteId: "site-1",
          token: "public-dev-key",
          scope: "read",
          actorId: "public:site-1",
        },
      },
      includeDraft: false,
    });
    mockedGetDeliveryContent.mockResolvedValue(null);

    const response = await GET(
      new Request("https://example.com/api/sites/site-1/content/news/missing"),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "content_not_found",
      error: "Content not found.",
    });
  });

  it("コンテンツが見つかった場合は JSON を返す", async () => {
    mockedResolveDeliveryRequest.mockResolvedValue({
      auth: {
        ok: true,
        context: {
          mode: "public",
          siteId: "site-1",
          token: "public-dev-key",
          scope: "read",
          actorId: "public:site-1",
        },
      },
      includeDraft: false,
    });
    mockedGetDeliveryContent.mockResolvedValue({
      id: "content-1",
      siteId: "site-1",
      contentType: "news",
      slug: "hello",
      title: "Hello",
      status: "published",
      dataJson: { body: "content" },
      createdBy: null,
      updatedBy: null,
      publishedAt: null,
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const response = await GET(
      new Request("https://example.com/api/sites/site-1/content/news/content-1"),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "content-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "content-1",
      title: "Hello",
      dataJson: { body: "content" },
    });
    expect(mockedGetDeliveryContent).toHaveBeenCalledWith("site-1", "news", "content-1", false);
  });
});
