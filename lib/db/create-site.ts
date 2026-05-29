import { prisma } from "@/lib/db/prisma";
import { createApiKeySecret } from "@/lib/db/api-keys";
import { getSiteSummary } from "@/lib/db/sites";
import { buildContentModelSeedRecords, readContentTypeDefinitions } from "@/lib/schemas";
import type { SiteSummary } from "@/lib/content/types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifySiteName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug.length > 0 ? slug : "site";
}

export interface CreateSiteInput {
  name?: unknown;
  slug?: unknown;
}

export type CreateSiteSuccess = {
  ok: true;
  site: SiteSummary;
  apiKeys: {
    public: string;
    admin: string;
  };
};

export type CreateSiteFailure = {
  ok: false;
  status: 400 | 409;
  code: string;
  error: string;
};

export type CreateSiteResult = CreateSiteSuccess | CreateSiteFailure;

function parseCreateSiteInput(input: CreateSiteInput): CreateSiteFailure | { name: string; slug: string } {
  if (typeof input.name !== "string" || input.name.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      code: "invalid_site_name",
      error: "Site name is required.",
    };
  }

  const name = input.name.trim();
  const rawSlug =
    typeof input.slug === "string" && input.slug.trim().length > 0 ? input.slug.trim() : slugifySiteName(name);
  const slug = rawSlug.toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_site_slug",
      error: "Site slug must use lowercase letters, numbers, and hyphens.",
    };
  }

  return { name, slug };
}

async function resolveOwnerUserId(): Promise<string | null> {
  const demoEmail = process.env.ADMIN_DEMO_EMAIL ?? "admin@example.com";
  const user = await prisma.user.findUnique({
    where: { email: demoEmail },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function createSite(input: CreateSiteInput): Promise<CreateSiteResult> {
  const parsed = parseCreateSiteInput(input);
  if ("ok" in parsed) {
    return parsed;
  }

  const { name, slug } = parsed;

  const existing = await prisma.site.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    return {
      ok: false,
      status: 409,
      code: "site_slug_conflict",
      error: "A site with this slug already exists.",
    };
  }

  const definitions = await readContentTypeDefinitions();
  const ownerUserId = await resolveOwnerUserId();
  const publicKey = createApiKeySecret("public");
  const adminKey = createApiKeySecret("admin");

  const siteId = await prisma.$transaction(async (tx) => {
    const site = await tx.site.create({
      data: {
        name,
        slug,
      },
    });

    if (ownerUserId) {
      await tx.siteMember.create({
        data: {
          siteId: site.id,
          userId: ownerUserId,
          role: "owner",
        },
      });
    }

    await tx.apiKey.createMany({
      data: [
        {
          siteId: site.id,
          name: "Public API key",
          kind: "public",
          prefix: publicKey.prefix,
          keyHash: publicKey.keyHash,
        },
        {
          siteId: site.id,
          name: "Admin API key",
          kind: "admin",
          prefix: adminKey.prefix,
          keyHash: adminKey.keyHash,
        },
      ],
    });

    const contentModels = buildContentModelSeedRecords(
      site.id,
      definitions.map((record) => record.definition),
    );

    await tx.contentModel.createMany({
      data: contentModels,
    });

    return site.id;
  });

  const site = await getSiteSummary(siteId);
  if (!site) {
    return {
      ok: false,
      status: 400,
      code: "site_create_failed",
      error: "Site was created but could not be loaded.",
    };
  }

  return {
    ok: true,
    site,
    apiKeys: {
      public: publicKey.secret,
      admin: adminKey.secret,
    },
  };
}
