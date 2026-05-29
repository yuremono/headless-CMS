import type { Asset, Content, ContentModel, Site } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    site: {
      findUnique: vi.fn(),
    },
    contentModel: {
      findMany: vi.fn(),
    },
    content: {
      findMany: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("./site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

import { prisma } from "./prisma";
import { resolveSiteId } from "./site-resolver";
import { buildSiteExport } from "./site-export";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedSiteFindUnique = vi.mocked(prisma.site.findUnique);
const mockedModelFindMany = vi.mocked(prisma.contentModel.findMany);
const mockedContentFindMany = vi.mocked(prisma.content.findMany);
const mockedAssetFindMany = vi.mocked(prisma.asset.findMany);

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
    id: "model-page",
    siteId: "site-1",
    name: "ページ",
    apiName: "page",
    type: "collection",
    schemaJson: { fields: [] },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: "content-1",
    siteId: "site-1",
    modelId: "model-page",
    slug: "about",
    title: "About",
    status: "draft",
    dataJson: { summary: "要約" },
    createdBy: null,
    updatedBy: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    siteId: "site-1",
    url: "/uploads/photo.jpg",
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    width: 800,
    height: 600,
    alt: "写真",
    createdBy: null,
    createdAt: now,
    ...overrides,
  };
}

describe("buildSiteExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedSiteFindUnique.mockResolvedValue(makeSite());
    mockedModelFindMany.mockResolvedValue([makeModel()]);
    mockedContentFindMany.mockResolvedValue([makeContent()]);
    mockedAssetFindMany.mockResolvedValue([makeAsset()]);
  });

  it("サイト未解決は null", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    await expect(buildSiteExport("missing")).resolves.toBeNull();
  });

  it("content-models / contents / assets を含む JSON を組み立てる", async () => {
    const payload = await buildSiteExport("main-site");

    expect(payload).toMatchObject({
      version: 1,
      site: {
        id: "site-1",
        slug: "main-site",
        name: "Main Site",
      },
      "content-models": [expect.objectContaining({ apiName: "page" })],
      contents: {
        page: [expect.objectContaining({ slug: "about", status: "draft" })],
      },
      assets: [expect.objectContaining({ url: "/uploads/photo.jpg", filename: "photo.jpg" })],
    });
    expect(payload?.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("contentType 指定時はモデルとコンテンツを絞り込む", async () => {
    await buildSiteExport("main-site", { contentType: "page" });

    expect(mockedModelFindMany).toHaveBeenCalledWith({
      where: { siteId: "site-1", apiName: "page" },
      orderBy: { apiName: "asc" },
    });
  });
});
