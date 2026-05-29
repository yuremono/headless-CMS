import type { Content, ContentModel, Site, User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    site: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    content: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    asset: {
      count: vi.fn(),
    },
    contentModel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("./site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

import { prisma } from "./prisma";
import { resolveSiteId } from "./site-resolver";
import {
  getAdminContent,
  getDashboardSnapshot,
  getSiteSummary,
  listAdminContentTypes,
  listAdminContents,
  listSiteSummaries,
} from "./sites";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedSiteFindMany = vi.mocked(prisma.site.findMany);
const mockedSiteFindUnique = vi.mocked(prisma.site.findUnique);
const mockedContentCount = vi.mocked(prisma.content.count);
const mockedAssetCount = vi.mocked(prisma.asset.count);
const mockedModelFindMany = vi.mocked(prisma.contentModel.findMany);
const mockedModelFindUnique = vi.mocked(prisma.contentModel.findUnique);
const mockedContentFindMany = vi.mocked(prisma.content.findMany);
const mockedContentFindFirst = vi.mocked(prisma.content.findFirst);

const now = new Date("2026-05-29T00:00:00.000Z");

function makeSite(overrides: Partial<Site> = {}): Site {
  return {
    id: "site-1",
    name: "Main Site",
    slug: "main-site",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeModel(overrides: Partial<ContentModel> = {}): ContentModel {
  return {
    id: "model-news",
    siteId: "site-1",
    name: "お知らせ",
    apiName: "news",
    type: "collection",
    schemaJson: { description: "ニュース", fields: [] },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: "content-1",
    siteId: "site-1",
    modelId: "model-news",
    slug: "hello",
    title: "Hello",
    status: "published",
    dataJson: { summary: "要約" },
    createdBy: "user-1",
    updatedBy: "user-1",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "admin@example.com",
    name: "Admin",
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("listSiteSummaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedContentCount.mockResolvedValue(2);
    mockedAssetCount.mockResolvedValue(3);
  });

  it("サイト一覧に集計情報を付与する", async () => {
    mockedSiteFindMany.mockResolvedValue([makeSite()]);
    mockedContentCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);

    const summaries = await listSiteSummaries();

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: "site-1",
      slug: "main-site",
      publishedCount: 5,
      draftCount: 1,
      imageUsage: "24%",
    });
  });
});

describe("getSiteSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedContentCount.mockResolvedValue(0);
    mockedAssetCount.mockResolvedValue(0);
  });

  it("サイト未解決時は null", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    expect(await getSiteSummary("unknown")).toBeNull();
  });

  it("サイトが存在すればサマリーを返す", async () => {
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedSiteFindUnique.mockResolvedValue(makeSite());

    const summary = await getSiteSummary("main-site");

    expect(summary?.slug).toBe("main-site");
    expect(summary?.domain).toBe("main-site.example.com");
  });
});

describe("listAdminContentTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サイト未解決時は空配列", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    expect(await listAdminContentTypes("unknown")).toEqual([]);
  });

  it("コンテンツ種類定義を返す", async () => {
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedModelFindMany.mockResolvedValue([makeModel()]);

    const types = await listAdminContentTypes("main-site");

    expect(types[0]).toMatchObject({ slug: "news", label: "お知らせ", kind: "collection" });
  });
});

describe("listAdminContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("モデルが無い場合は空配列", async () => {
    mockedModelFindUnique.mockResolvedValue(null);

    expect(await listAdminContents("main-site", "news")).toEqual([]);
  });

  it("管理画面用レコード一覧を返す", async () => {
    mockedModelFindUnique.mockResolvedValue(makeModel());
    mockedContentFindMany.mockResolvedValue([
      { ...makeContent(), creator: makeUser() },
    ]);

    const rows = await listAdminContents("main-site", "news");

    expect(rows[0]).toMatchObject({
      id: "content-1",
      contentType: "news",
      author: "Admin",
    });
  });
});

describe("getAdminContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedModelFindUnique.mockResolvedValue(makeModel());
  });

  it("id または slug で1件取得する", async () => {
    mockedContentFindFirst.mockResolvedValue({
      ...makeContent(),
      creator: makeUser(),
    });

    const record = await getAdminContent("main-site", "news", "hello");

    expect(record?.slug).toBe("hello");
    expect(mockedContentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ id: "hello" }, { slug: "hello" }],
        }),
      }),
    );
  });

  it("見つからない場合は null", async () => {
    mockedContentFindFirst.mockResolvedValue(null);

    expect(await getAdminContent("main-site", "news", "missing")).toBeNull();
  });
});

describe("getDashboardSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSiteFindMany.mockResolvedValue([makeSite()]);
    mockedContentCount.mockResolvedValue(0);
    mockedAssetCount.mockResolvedValue(0);
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedModelFindMany.mockResolvedValue([makeModel()]);
  });

  it("ダッシュボード用スナップショットを組み立てる", async () => {
    mockedContentFindMany.mockResolvedValue([
      {
        ...makeContent(),
        model: makeModel(),
        creator: makeUser(),
      },
    ]);

    const snapshot = await getDashboardSnapshot();

    expect(snapshot.sites).toHaveLength(1);
    expect(snapshot.recentContents).toHaveLength(1);
    expect(snapshot.contentTypes[0]?.slug).toBe("news");
  });
});
