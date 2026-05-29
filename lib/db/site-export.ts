import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { mapAssetRecord } from "@/lib/db/assets";
import { toContentModelRecord, toContentRecord } from "@/lib/content/mappers";
import type { ContentModelRecord, ContentRecord } from "@/lib/content/types";

export const SITE_EXPORT_VERSION = 1 as const;

export interface SiteExportSiteMeta {
  id: string;
  slug: string;
  name: string;
  updatedAt: string;
}

export interface SiteExportPayload {
  version: typeof SITE_EXPORT_VERSION;
  exportedAt: string;
  site: SiteExportSiteMeta;
  "content-models": ContentModelRecord[];
  contents: Record<string, ContentRecord[]>;
  assets: ReturnType<typeof mapAssetRecord>[];
}

export interface BuildSiteExportOptions {
  contentType?: string | null;
}

export async function buildSiteExport(
  siteIdOrSlug: string,
  options: BuildSiteExportOptions = {},
): Promise<SiteExportPayload | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return null;
  }

  const contentTypeFilter = options.contentType?.trim() || null;

  const models = await prisma.contentModel.findMany({
    where: {
      siteId,
      ...(contentTypeFilter ? { apiName: contentTypeFilter } : {}),
    },
    orderBy: { apiName: "asc" },
  });

  const contentModels = models.map(toContentModelRecord);
  const contents: Record<string, ContentRecord[]> = {};

  await Promise.all(
    contentModels.map(async (model) => {
      const rows = await prisma.content.findMany({
        where: {
          siteId,
          modelId: model.id,
        },
        orderBy: { updatedAt: "desc" },
      });

      contents[model.apiName] = rows.map((row) => toContentRecord(row, model.apiName));
    }),
  );

  const assetRows = await prisma.asset.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
  });

  return {
    version: SITE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    site: {
      id: site.id,
      slug: site.slug,
      name: site.name,
      updatedAt: site.updatedAt.toISOString(),
    },
    "content-models": contentModels,
    contents,
    assets: assetRows.map(mapAssetRecord),
  };
}
