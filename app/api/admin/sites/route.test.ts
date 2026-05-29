import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveGlobalAdminRequest: vi.fn(),
}));

vi.mock("@/lib/db/sites", () => ({
  listSiteSummaries: vi.fn(),
}));

vi.mock("@/lib/db/create-site", () => ({
  createSite: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditLog: vi.fn(),
  auditMetadataFromContext: vi.fn(() => ({})),
}));

import { resolveGlobalAdminRequest } from "@/lib/content/service";
import { createSite } from "@/lib/db/create-site";
import { listSiteSummaries } from "@/lib/db/sites";

const mockedResolve = vi.mocked(resolveGlobalAdminRequest);
const mockedListSites = vi.mocked(listSiteSummaries);
const mockedCreateSite = vi.mocked(createSite);

describe("GET /api/admin/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証失敗時はエラーレスポンス", async () => {
    mockedResolve.mockResolvedValue({
      ok: false,
      failure: { status: 401, code: "missing_api_key", error: "API key is required." },
    });

    const response = await GET(new Request("https://example.com/api/admin/sites"));

    expect(response.status).toBe(401);
    expect(mockedListSites).not.toHaveBeenCalled();
  });

  it("認証成功時はサイト一覧 JSON", async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "*", token: "k", scope: "write", actorId: "admin:*" },
    });
    mockedListSites.mockResolvedValue([
      {
        id: "site-1",
        slug: "main-site",
        name: "Main",
        domain: "example.com",
        description: "",
        publishedCount: 2,
        draftCount: 1,
        imageUsage: "0/100",
        updatedAt: "2026-05-29T00:00:00.000Z",
      },
    ]);

    const response = await GET(
      new Request("https://example.com/api/admin/sites", {
        headers: { "x-admin-api-key": "admin-dev-key" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ slug: "main-site", publishedCount: 2 }),
    ]);
  });
});

describe("POST /api/admin/sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "*", token: "k", scope: "write", actorId: "admin:*" },
    });
  });

  it("サイト作成成功時 201", async () => {
    mockedCreateSite.mockResolvedValue({
      ok: true,
      site: { id: "site-new", slug: "new-site", name: "New Site" },
      apiKeys: { public: "pub", admin: "adm" },
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites", {
        method: "POST",
        body: JSON.stringify({ name: "New Site", slug: "new-site" }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      site: { slug: "new-site" },
      apiKeys: { public: "pub" },
    });
  });

  it("不正ボディは 400", async () => {
    const response = await POST(
      new Request("https://example.com/api/admin/sites", {
        method: "POST",
        body: "[]",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedCreateSite).not.toHaveBeenCalled();
  });

  it("createSite 失敗時はエラーを返す", async () => {
    mockedCreateSite.mockResolvedValue({
      ok: false,
      status: 409,
      code: "slug_taken",
      error: "Slug already exists.",
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites", {
        method: "POST",
        body: JSON.stringify({ name: "Dup", slug: "main-site" }),
      }),
    );

    expect(response.status).toBe(409);
  });
});
