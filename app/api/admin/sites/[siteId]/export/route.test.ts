import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
}));

vi.mock("@/lib/db/site-export", () => ({
  buildSiteExport: vi.fn(),
}));

import { resolveAdminRequest } from "@/lib/content/service";
import { buildSiteExport } from "@/lib/db/site-export";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedBuildExport = vi.mocked(buildSiteExport);

const samplePayload = {
  version: 1 as const,
  exportedAt: "2026-05-29T12:00:00.000Z",
  site: { id: "site-1", slug: "main-site", name: "Main", updatedAt: "2026-05-29T00:00:00.000Z" },
  "content-models": [],
  contents: {},
  assets: [],
};

describe("GET /api/admin/sites/[siteId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
    mockedBuildExport.mockResolvedValue(samplePayload);
  });

  it("認証失敗時はエラー", async () => {
    mockedResolve.mockResolvedValue({
      ok: false,
      failure: { status: 401, code: "missing_session", error: "Session is required." },
    });

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/export"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("content:read でエクスポート JSON を返す", async () => {
    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/export"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(samplePayload);
    expect(mockedResolve).toHaveBeenCalledWith(expect.any(Request), "site-1", {
      permission: "content:read",
    });
    expect(mockedBuildExport).toHaveBeenCalledWith("site-1", { contentType: null });
  });

  it("contentType クエリを buildSiteExport に渡す", async () => {
    await GET(
      new Request("https://example.com/api/admin/sites/site-1/export?contentType=page"),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(mockedBuildExport).toHaveBeenCalledWith("site-1", { contentType: "page" });
  });

  it("サイト未存在は 404", async () => {
    mockedBuildExport.mockResolvedValue(null);

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/export"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(404);
  });
});
