import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  getAdminContentTypes: vi.fn(),
}));

import { getAdminContentTypes, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedGetTypes = vi.mocked(getAdminContentTypes);

describe("GET /api/admin/sites/[siteId]/content-types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "session", siteId: "site-1", token: "s", scope: "write", actorId: "session:site-1" },
    });
  });

  it("管理 UI 向けコンテンツ種類定義を返す", async () => {
    mockedGetTypes.mockResolvedValue([
      {
        slug: "news",
        label: "お知らせ",
        kind: "collection",
        description: "ニュース",
        schemaJson: { fields: [] },
      },
    ]);

    const response = await GET(
      new Request("https://example.com/api/admin/sites/site-1/content-types"),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ slug: "news", label: "お知らせ" }),
    ]);
  });
});
