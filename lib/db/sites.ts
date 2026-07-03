import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { resolveSite, resolveSiteId } from "@/lib/db/site-resolver";
import { toAdminContentRecord, toAdminContentTypeDefinition } from "@/lib/content/mappers";
import type { AdminContentRecord, DashboardSnapshot, SiteSummary } from "@/lib/content/types";

async function buildSiteSummary(site: {
  id: string;
  name: string;
  slug: string;
  updatedAt: Date;
}): Promise<SiteSummary> {
  const [publishedCount, draftCount, assetCount] = await Promise.all([
    prisma.content.count({ where: { siteId: site.id, status: "published" } }),
    prisma.content.count({ where: { siteId: site.id, status: "draft" } }),
    prisma.asset.count({ where: { siteId: site.id } }),
  ]);

  return {
    id: site.id,
    slug: site.slug,
    name: site.name,
    domain: `${site.slug}.example.com`,
    description: site.name,
    publishedCount,
    draftCount,
    imageUsage: assetCount > 0 ? `${Math.min(assetCount * 8, 100)}%` : "0%",
    updatedAt: site.updatedAt.toISOString(),
  };
}

export async function listSiteSummaries(): Promise<SiteSummary[]> {
  const sites = await prisma.site.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return Promise.all(sites.map((site) => buildSiteSummary(site)));
}

export async function getSiteSummary(siteIdOrSlug: string): Promise<SiteSummary | null> {
  const site = await resolveSite(siteIdOrSlug);
  if (!site) {
    return null;
  }

  return buildSiteSummary(site);
}

export async function listAdminContentTypes(siteIdOrSlug: string) {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return [];
  }

  const models = await prisma.contentModel.findMany({
    where: { siteId },
    orderBy: { apiName: "asc" },
  });

  return models.map(toAdminContentTypeDefinition);
}

async function fetchAdminContents(siteIdOrSlug: string, contentType: string): Promise<AdminContentRecord[]> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return [];
  }

  const model = await prisma.contentModel.findUnique({
    where: {
      siteId_apiName: {
        siteId,
        apiName: contentType,
      },
    },
  });

  if (!model) {
    return [];
  }

  const rows = await prisma.content.findMany({
    where: {
      siteId,
      modelId: model.id,
    },
    include: {
      creator: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => toAdminContentRecord(row, contentType, row.creator));
}

/** 同一リクエスト内でダッシュボード集計と個別取得が重複しないよう cache する */
export const listAdminContents = cache(fetchAdminContents);

export async function getAdminContent(
  siteIdOrSlug: string,
  contentType: string,
  id: string,
): Promise<AdminContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await prisma.contentModel.findUnique({
    where: {
      siteId_apiName: {
        siteId,
        apiName: contentType,
      },
    },
  });

  if (!model) {
    return null;
  }

  const row = await prisma.content.findFirst({
    where: {
      siteId,
      modelId: model.id,
      OR: [{ id }, { slug: id }],
    },
    include: {
      creator: true,
    },
  });

  return row ? toAdminContentRecord(row, contentType, row.creator) : null;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const sites = await listSiteSummaries();
  const recentRows = await prisma.content.findMany({
    take: 4,
    orderBy: { updatedAt: "desc" },
    include: {
      model: true,
      creator: true,
    },
  });

  const recentContents = recentRows.map((row) =>
    toAdminContentRecord(row, row.model.apiName, row.creator),
  );

  const primarySiteId = sites[0]?.id;
  const contentTypes = primarySiteId ? await listAdminContentTypes(primarySiteId) : [];

  return {
    sites,
    recentContents,
    contentTypes,
  };
}
