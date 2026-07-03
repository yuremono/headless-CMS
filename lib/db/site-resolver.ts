import { cache } from "react";
import type { Site } from "@prisma/client";
import { prisma } from "./prisma";

async function fetchSite(siteIdOrSlug: string): Promise<Site | null> {
  return prisma.site.findFirst({
    where: {
      OR: [{ id: siteIdOrSlug }, { slug: siteIdOrSlug }],
    },
  });
}

/** 同一リクエスト内で何度呼ばれても DB 問い合わせは 1 回に集約する */
export const resolveSite = cache(fetchSite);

export async function resolveSiteId(siteIdOrSlug: string): Promise<string | null> {
  const site = await resolveSite(siteIdOrSlug);
  return site?.id ?? null;
}
