import "server-only";

import type {
  AdminContentRecord,
  AdminContentTypeDefinition,
  DashboardSnapshot,
  SiteSummary,
} from "@/lib/content/types";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { listAssets } from "@/lib/db/assets";
import {
  getAdminContent,
  getDashboardSnapshot,
  getSiteSummary,
  listAdminContentTypes,
  listAdminContents,
  listSiteSummaries,
} from "@/lib/db/sites";

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function dbLoadSites(): Promise<SiteSummary[] | null> {
  const sites = await safe(() => listSiteSummaries());
  return sites && sites.length > 0 ? sites : null;
}

export async function dbResolveSite(siteIdOrSlug: string): Promise<SiteSummary | null> {
  return safe(() => getSiteSummary(siteIdOrSlug));
}

export async function dbLoadContentTypes(siteIdOrSlug: string): Promise<AdminContentTypeDefinition[] | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const types = await safe(() => listAdminContentTypes(siteIdOrSlug));
  return types && types.length > 0 ? types : null;
}

export async function dbLoadContents(
  siteIdOrSlug: string,
  contentType: string,
): Promise<AdminContentRecord[] | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  return safe(() => listAdminContents(siteIdOrSlug, contentType));
}

export async function dbLoadContent(
  siteIdOrSlug: string,
  contentType: string,
  id: string,
): Promise<AdminContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  return safe(() => getAdminContent(siteIdOrSlug, contentType, id));
}

export async function dbLoadAssets(
  siteIdOrSlug: string,
  options: { limit?: number; offset?: number } = {},
) {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  return safe(() => listAssets(siteId, options));
}

export async function dbLoadDashboardSnapshot(siteIdOrSlug?: string): Promise<DashboardSnapshot | null> {
  if (siteIdOrSlug) {
    const site = await dbResolveSite(siteIdOrSlug);
    if (!site) {
      return null;
    }

    const [contentTypes, topPageContents, pageContents, newsContents] = await Promise.all([
      dbLoadContentTypes(siteIdOrSlug),
      dbLoadContents(siteIdOrSlug, "topPage"),
      dbLoadContents(siteIdOrSlug, "page"),
      dbLoadContents(siteIdOrSlug, "news"),
    ]);

    const recentContents = [...(topPageContents ?? []), ...(pageContents ?? []), ...(newsContents ?? [])]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 4);

    return {
      sites: [site],
      recentContents,
      contentTypes: contentTypes ?? [],
    };
  }

  const snapshot = await safe(() => getDashboardSnapshot());
  return snapshot && snapshot.sites.length > 0 ? snapshot : null;
}
