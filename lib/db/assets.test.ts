import type { Asset } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    asset: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";
import { createAsset, listAssets, mapAssetRecord, updateAsset } from "./assets";

const mockedCreate = vi.mocked(prisma.asset.create);
const mockedFindMany = vi.mocked(prisma.asset.findMany);
const mockedCount = vi.mocked(prisma.asset.count);
const mockedFindFirst = vi.mocked(prisma.asset.findFirst);
const mockedUpdate = vi.mocked(prisma.asset.update);

const now = new Date("2026-05-29T00:00:00.000Z");

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    siteId: "site-1",
    url: "/uploads/site-1/photo.jpg",
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    width: 800,
    height: 600,
    alt: "Hero",
    createdBy: "user-1",
    createdAt: now,
    ...overrides,
  };
}

describe("mapAssetRecord", () => {
  it("Asset を API 用オブジェクトに変換する", () => {
    expect(mapAssetRecord(makeAsset())).toEqual({
      id: "asset-1",
      siteId: "site-1",
      url: "/uploads/site-1/photo.jpg",
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      width: 800,
      height: 600,
      alt: "Hero",
      createdBy: "user-1",
      createdAt: now.toISOString(),
    });
  });
});

describe("createAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("アセットを作成してマップ結果を返す", async () => {
    mockedCreate.mockResolvedValue(makeAsset());

    const result = await createAsset({
      siteId: "site-1",
      url: "/uploads/site-1/photo.jpg",
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      width: 800,
      height: 600,
      alt: "Hero",
      createdBy: "user-1",
    });

    expect(result.id).toBe("asset-1");
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        siteId: "site-1",
        alt: "Hero",
        width: 800,
        height: 600,
      }),
    });
  });
});

describe("listAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ページネーション付きで一覧を返す", async () => {
    mockedFindMany.mockResolvedValue([makeAsset()]);
    mockedCount.mockResolvedValue(1);

    const result = await listAssets("site-1", { limit: 10, offset: 5 });

    expect(result).toEqual({
      items: [expect.objectContaining({ id: "asset-1" })],
      total: 1,
      limit: 10,
      offset: 5,
    });
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { siteId: "site-1" },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 5,
    });
  });

  it("limit/offset 未指定時は既定値を使う", async () => {
    mockedFindMany.mockResolvedValue([]);
    mockedCount.mockResolvedValue(0);

    const result = await listAssets("site-1");

    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });
});

describe("updateAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("存在するアセットの alt を更新する", async () => {
    mockedFindFirst.mockResolvedValue(makeAsset());
    mockedUpdate.mockResolvedValue(makeAsset({ alt: "Updated" }));

    const result = await updateAsset({
      assetId: "asset-1",
      siteId: "site-1",
      alt: "Updated",
    });

    expect(result?.alt).toBe("Updated");
  });

  it("存在しない場合は null", async () => {
    mockedFindFirst.mockResolvedValue(null);

    expect(
      await updateAsset({
        assetId: "missing",
        siteId: "site-1",
        alt: "x",
      }),
    ).toBeNull();
  });
});
