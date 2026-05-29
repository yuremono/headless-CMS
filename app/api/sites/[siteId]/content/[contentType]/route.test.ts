import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveDeliveryRequest: vi.fn(),
  listDeliveryContents: vi.fn(),
}));

import { listDeliveryContents, resolveDeliveryRequest } from "@/lib/content/service";

const mockedResolveDeliveryRequest = vi.mocked(resolveDeliveryRequest);
const mockedListDeliveryContents = vi.mocked(listDeliveryContents);

describe("GET /api/sites/[siteId]/content/[contentType]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証失敗時はエラーレスポンスを返す", async () => {
    mockedResolveDeliveryRequest.mockResolvedValue({
      auth: {
        ok: false,
        failure: { status: 401, code: "missing_api_key", error: "API key is required." },
      },
      includeDraft: false,
    });

    const response = await GET(new Request("https://example.com/api/sites/site-1/content/news"), {
      params: Promise.resolve({ siteId: "site-1", contentType: "news" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "missing_api_key",
      error: "API key is required.",
    });
    expect(mockedListDeliveryContents).not.toHaveBeenCalled();
  });

  it("認証成功時はコレクション JSON を返す", async () => {
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
    mockedListDeliveryContents.mockResolvedValue({
      items: [
        {
          id: "content-1",
          siteId: "site-1",
          contentType: "news",
          slug: "hello",
          title: "Hello",
          status: "published",
          dataJson: {},
          createdBy: null,
          updatedBy: null,
          publishedAt: null,
          createdAt: "2026-05-29T00:00:00.000Z",
          updatedAt: "2026-05-29T00:00:00.000Z",
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });

    const response = await GET(
      new Request("https://example.com/api/sites/site-1/content/news?limit=20"),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      total: 1,
      items: [{ id: "content-1", contentType: "news" }],
    });
    expect(mockedListDeliveryContents).toHaveBeenCalledWith(
      "site-1",
      "news",
      expect.any(URLSearchParams),
      false,
    );
  });
});
