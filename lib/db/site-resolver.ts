import type { Site } from "@prisma/client";
import { prisma } from "./prisma";

export async function resolveSite(siteIdOrSlug: string): Promise<Site | null> {
  return prisma.site.findFirst({
    where: {
      OR: [{ id: siteIdOrSlug }, { slug: siteIdOrSlug }],
    },
  });
}

export async function resolveSiteId(siteIdOrSlug: string): Promise<string | null> {
  const site = await resolveSite(siteIdOrSlug);
  return site?.id ?? null;
}
