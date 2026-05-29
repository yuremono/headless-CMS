import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

vi.mock("@/lib/db/assets", () => ({
  listAssets: vi.fn(),
}));

vi.mock("@/lib/db/sites", () => ({
  listSiteSummaries: vi.fn(),
  getSiteSummary: vi.fn(),
  listAdminContentTypes: vi.fn(),
  listAdminContents: vi.fn(),
  getAdminContent: vi.fn(),
  getDashboardSnapshot: vi.fn(),
}));

import { listAssets } from "@/lib/db/assets";
import { resolveSiteId } from "@/lib/db/site-resolver";
import {
  getAdminContent,
  getDashboardSnapshot,
  getSiteSummary,
  listAdminContentTypes,
  listAdminContents,
  listSiteSummaries,
} from "@/lib/db/sites";
import {
  dbLoadAssets,
  dbLoadContent,
  dbLoadContents,
  dbLoadContentTypes,
  dbLoadDashboardSnapshot,
  dbLoadSites,
  dbResolveSite,
} from "./loader";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedListAssets = vi.mocked(listAssets);
const mockedListSiteSummaries = vi.mocked(listSiteSummaries);
const mockedGetSiteSummary = vi.mocked(getSiteSummary);
const mockedListAdminContentTypes = vi.mocked(listAdminContentTypes);
const mockedListAdminContents = vi.mocked(listAdminContents);
const mockedGetAdminContent = vi.mocked(getAdminContent);
const mockedGetDashboardSnapshot = vi.mocked(getDashboardSnapshot);

const siteSummary = {
  id: "site-1",
  slug: "main-site",
  name: "Main",
  domain: "main-site.example.com",
  description: "Main",
  publishedCount: 1,
  draftCount: 0,
  imageUsage: "0%",
  updatedAt: "2026-05-29T12:00:00.000Z",
};

const adminContent = {
  id: "content-1",
  contentType: "news",
  siteId: "site-1",
  title: "Hello",
  slug: "hello",
  status: "published" as const,
  updatedAt: "2026-05-29T11:00:00.000Z",
  author: "Admin",
  summary: "要約",
  data: {},
};

describe("dbLoadSites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サイト一覧を返す", async () => {
    mockedListSiteSummaries.mockResolvedValue([siteSummary]);

    expect(await dbLoadSites()).toEqual([siteSummary]);
  });

  it("空配列や例外時は null", async () => {
    mockedListSiteSummaries.mockResolvedValue([]);
    expect(await dbLoadSites()).toBeNull();

    mockedListSiteSummaries.mockRejectedValue(new Error("db down"));
    expect(await dbLoadSites()).toBeNull();
  });
});

describe("dbResolveSite", () => {
  it("サイトサマリーを返す", async () => {
    mockedGetSiteSummary.mockResolvedValue(siteSummary);

    expect(await dbResolveSite("main-site")).toEqual(siteSummary);
  });

  it("例外時は null", async () => {
    mockedGetSiteSummary.mockRejectedValue(new Error("fail"));

    expect(await dbResolveSite("main-site")).toBeNull();
  });
});

describe("dbLoadContentTypes / dbLoadContents / dbLoadContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("サイト未解決時は null", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    expect(await dbLoadContentTypes("unknown")).toBeNull();
    expect(await dbLoadContents("unknown", "news")).toBeNull();
    expect(await dbLoadContent("unknown", "news", "id")).toBeNull();
  });

  it("コンテンツ種類を返す", async () => {
    mockedListAdminContentTypes.mockResolvedValue([
      { slug: "news", label: "News", kind: "collection", description: "", schemaJson: {} },
    ]);

    const types = await dbLoadContentTypes("main-site");

    expect(types?.[0]?.slug).toBe("news");
  });

  it("コンテンツ一覧を返す", async () => {
    mockedListAdminContents.mockResolvedValue([adminContent]);

    expect(await dbLoadContents("main-site", "news")).toEqual([adminContent]);
  });

  it("単一コンテンツを返す", async () => {
    mockedGetAdminContent.mockResolvedValue(adminContent);

    expect(await dbLoadContent("main-site", "news", "hello")).toEqual(adminContent);
  });
});

describe("dbLoadAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("アセット一覧を返す", async () => {
    mockedListAssets.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

    const result = await dbLoadAssets("main-site", { limit: 10 });

    expect(result?.limit).toBe(50);
    expect(mockedListAssets).toHaveBeenCalledWith("site-1", { limit: 10, offset: undefined });
  });
});

describe("dbLoadDashboardSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("サイト指定時はサイト単位のスナップショットを組み立てる", async () => {
    mockedGetSiteSummary.mockResolvedValue(siteSummary);
    mockedListAdminContentTypes.mockResolvedValue([
      { slug: "news", label: "News", kind: "collection", description: "", schemaJson: {} },
    ]);
    mockedListAdminContents.mockImplementation(async (_site, type) => {
      if (type === "news") {
        return [{ ...adminContent, updatedAt: "2026-05-29T13:00:00.000Z" }];
      }
      return [{ ...adminContent, updatedAt: "2026-05-29T10:00:00.000Z" }];
    });

    const snapshot = await dbLoadDashboardSnapshot("main-site");

    expect(snapshot?.sites).toEqual([siteSummary]);
    expect(snapshot?.recentContents).toHaveLength(3);
    expect(snapshot?.recentContents[0]?.updatedAt).toBe("2026-05-29T13:00:00.000Z");
  });

  it("サイト未指定時は getDashboardSnapshot を使う", async () => {
    mockedGetDashboardSnapshot.mockResolvedValue({
      sites: [siteSummary],
      recentContents: [adminContent],
      contentTypes: [],
    });

    const snapshot = await dbLoadDashboardSnapshot();

    expect(snapshot?.sites).toHaveLength(1);
  });

  it("サイト指定でサイトが見つからない場合は null", async () => {
    mockedGetSiteSummary.mockResolvedValue(null);

    expect(await dbLoadDashboardSnapshot("missing")).toBeNull();
  });
});
