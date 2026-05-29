import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  resolveGlobalAdminRequest: vi.fn(),
  listAdminContents: vi.fn(),
  listAdminContentsUi: vi.fn(),
  createAdminContent: vi.fn(),
  publishAdminContent: vi.fn(),
}));

vi.mock("@/lib/db/sites", () => ({
  listSiteSummaries: vi.fn(),
}));

vi.mock("@/lib/db/create-site", () => ({
  createSite: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn().mockResolvedValue(undefined),
  recordAuditLog: vi.fn().mockResolvedValue(undefined),
  auditMetadataFromContext: vi.fn(() => ({})),
}));

vi.mock("@/lib/db/site-export", () => ({
  buildSiteExport: vi.fn(),
}));

import {
  createAdminContent,
  publishAdminContent,
  resolveAdminRequest,
  resolveGlobalAdminRequest,
} from "@/lib/content/service";

const mockedResolveAdmin = vi.mocked(resolveAdminRequest);
const mockedResolveGlobal = vi.mocked(resolveGlobalAdminRequest);
const mockedCreateContent = vi.mocked(createAdminContent);
const mockedPublishContent = vi.mocked(publishAdminContent);

const okContext = {
  ok: true as const,
  context: {
    mode: "admin" as const,
    siteId: "site-1",
    token: "k",
    scope: "write" as const,
    actorId: "admin:site-1",
  },
};

describe("管理 API route permission マッピング", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveAdmin.mockResolvedValue(okContext);
    mockedResolveGlobal.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "*", token: "k", scope: "write", actorId: "admin:*" },
    });
    mockedCreateContent.mockResolvedValue({
      id: "c1",
      title: "News",
    } as never);
    mockedPublishContent.mockResolvedValue({ id: "c1" } as never);
  });

  it("POST content は content:write", async () => {
    const { POST: createContent } = await import("./sites/[siteId]/content/[contentType]/route");

    await createContent(
      new Request("https://example.com/api/admin/sites/site-1/content/news", {
        method: "POST",
        body: JSON.stringify({ title: "News" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news" }) },
    );

    expect(mockedResolveAdmin).toHaveBeenCalledWith(
      expect.any(Request),
      "site-1",
      { permission: "content:write" },
    );
  });

  it("GET export は content:read", async () => {
    const { buildSiteExport } = await import("@/lib/db/site-export");
    vi.mocked(buildSiteExport).mockResolvedValue({
      version: 1,
      exportedAt: "2026-05-29T00:00:00.000Z",
      site: { id: "site-1", slug: "main", name: "Main", updatedAt: "2026-05-29T00:00:00.000Z" },
      "content-models": [],
      contents: {},
      assets: [],
    });

    const { GET: exportSite } = await import("./sites/[siteId]/export/route");

    await exportSite(new Request("https://example.com/api/admin/sites/site-1/export"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(mockedResolveAdmin).toHaveBeenCalledWith(expect.any(Request), "site-1", {
      permission: "content:read",
    });
  });

  it("POST publish は content:publish", async () => {
    const { POST: publishContent } = await import(
      "./sites/[siteId]/content/[contentType]/[id]/publish/route"
    );

    await publishContent(
      new Request("https://example.com/api/admin/sites/site-1/content/news/c1/publish", {
        method: "POST",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "c1" }) },
    );

    expect(mockedResolveAdmin).toHaveBeenCalledWith(
      expect.any(Request),
      "site-1",
      { permission: "content:publish" },
    );
  });

  it("POST /api/admin/sites は site:write", async () => {
    const { createSite: createSiteDb } = await import("@/lib/db/create-site");
    vi.mocked(createSiteDb).mockResolvedValue({
      ok: true,
      site: { id: "site-new", slug: "new", name: "New" },
      apiKeys: { public: "p", admin: "a" },
    });

    const { POST: createSite } = await import("./sites/route");

    await createSite(
      new Request("https://example.com/api/admin/sites", {
        method: "POST",
        body: JSON.stringify({ name: "New", slug: "new" }),
      }),
    );

    expect(mockedResolveGlobal).toHaveBeenCalledWith(expect.any(Request), {
      permission: "site:write",
    });
  });
});
