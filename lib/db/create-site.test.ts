import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    site: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/schemas", () => ({
  readContentTypeDefinitions: vi.fn(),
  buildContentModelSeedRecords: vi.fn(),
}));

vi.mock("./sites", () => ({
  getSiteSummary: vi.fn(),
}));

import { prisma } from "./prisma";
import { getSiteSummary } from "./sites";
import { buildContentModelSeedRecords, readContentTypeDefinitions } from "@/lib/schemas";
import { createSite, slugifySiteName } from "./create-site";

const mockedFindUniqueSite = vi.mocked(prisma.site.findUnique);
const mockedFindUniqueUser = vi.mocked(prisma.user.findUnique);
const mockedTransaction = vi.mocked(prisma.$transaction);
const mockedReadDefinitions = vi.mocked(readContentTypeDefinitions);
const mockedBuildModels = vi.mocked(buildContentModelSeedRecords);
const mockedGetSiteSummary = vi.mocked(getSiteSummary);

describe("slugifySiteName", () => {
  it("日本語名を kebab-case slug に変換する", () => {
    expect(slugifySiteName("  コーポレートサイト  ")).toBe("site");
  });

  it("英数字はハイフン区切りにする", () => {
    expect(slugifySiteName("My New Site")).toBe("my-new-site");
  });

  it("空文字列相当は site にフォールバックする", () => {
    expect(slugifySiteName("!!!")).toBe("site");
  });
});

describe("createSite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReadDefinitions.mockResolvedValue([
      {
        definition: {
          slug: "news",
          label: "News",
          kind: "collection",
          schemaJson: {},
        },
        sourcePath: "content-types/news.json",
      },
    ]);
    mockedBuildModels.mockReturnValue([
      {
        siteId: "site-new",
        name: "News",
        apiName: "news",
        type: "collection",
        schemaJson: {},
      },
    ]);
    mockedFindUniqueUser.mockResolvedValue({ id: "user-1" });
  });

  it("サイト名が無い場合は 400", async () => {
    const result = await createSite({ name: "   " });

    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "invalid_site_name",
      error: "Site name is required.",
    });
  });

  it("無効な slug は 400", async () => {
    const result = await createSite({ name: "Demo", slug: "Bad_Slug!" });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      code: "invalid_site_slug",
    });
  });

  it("slug 重複時は 409", async () => {
    mockedFindUniqueSite.mockResolvedValue({ id: "existing" });

    const result = await createSite({ name: "Demo", slug: "demo-site" });

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: "site_slug_conflict",
    });
  });

  it("作成成功時はサイトと API キーを返す", async () => {
    mockedFindUniqueSite.mockResolvedValue(null);
    mockedTransaction.mockImplementation(async (callback) => {
      const tx = {
        site: { create: vi.fn().mockResolvedValue({ id: "site-new", name: "Demo", slug: "demo-site" }) },
        siteMember: { create: vi.fn().mockResolvedValue({}) },
        apiKey: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        contentModel: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      };
      return callback(tx as never);
    });
    mockedGetSiteSummary.mockResolvedValue({
      id: "site-new",
      slug: "demo-site",
      name: "Demo",
      domain: "demo-site.example.com",
      description: "Demo",
      publishedCount: 0,
      draftCount: 0,
      imageUsage: "0%",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const result = await createSite({ name: "Demo", slug: "demo-site" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.site.slug).toBe("demo-site");
      expect(result.apiKeys.public).toMatch(/^public_/);
      expect(result.apiKeys.admin).toMatch(/^admin_/);
    }
  });

  it("作成後にサマリー取得できない場合は 400", async () => {
    mockedFindUniqueSite.mockResolvedValue(null);
    mockedTransaction.mockResolvedValue("site-new");
    mockedGetSiteSummary.mockResolvedValue(null);

    const result = await createSite({ name: "Demo" });

    expect(result).toMatchObject({
      ok: false,
      code: "site_create_failed",
    });
  });
});
