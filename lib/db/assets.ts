import type { Asset } from "@prisma/client";
import { prisma } from "./prisma";

export interface CreateAssetInput {
  siteId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  createdBy?: string | null;
}

export function mapAssetRecord(asset: Asset) {
  return {
    id: asset.id,
    siteId: asset.siteId,
    url: asset.url,
    filename: asset.filename,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    alt: asset.alt,
    createdBy: asset.createdBy,
    createdAt: asset.createdAt.toISOString(),
  };
}

export async function createAsset(input: CreateAssetInput) {
  const asset = await prisma.asset.create({
    data: {
      siteId: input.siteId,
      url: input.url,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      width: input.width ?? null,
      height: input.height ?? null,
      alt: input.alt ?? null,
      createdBy: input.createdBy ?? null,
    },
  });

  return mapAssetRecord(asset);
}

export interface AssetCollectionResult {
  items: ReturnType<typeof mapAssetRecord>[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAssets(
  siteId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<AssetCollectionResult> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.asset.count({ where: { siteId } }),
  ]);

  return {
    items: items.map(mapAssetRecord),
    total,
    limit,
    offset,
  };
}

export async function updateAsset(input: {
  assetId: string;
  siteId: string;
  alt?: string | null;
}) {
  const existing = await prisma.asset.findFirst({
    where: {
      id: input.assetId,
      siteId: input.siteId,
    },
  });

  if (!existing) {
    return null;
  }

  const asset = await prisma.asset.update({
    where: { id: input.assetId },
    data: {
      alt: input.alt ?? null,
    },
  });

  return mapAssetRecord(asset);
}

export async function deleteAsset(input: {
  assetId: string;
  siteId: string;
}): Promise<boolean> {
  const result = await prisma.asset.deleteMany({
    where: {
      id: input.assetId,
      siteId: input.siteId,
    },
  });

  return result.count > 0;
}
