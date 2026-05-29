import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "../lib/db/prisma";
import {
  buildContentModelSeedRecords,
  readContentTypeDefinitions,
} from "../lib/schemas";
import { exportSiteContent } from "../lib/static-export";

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function createApiKeySecret(prefix: string): {
  prefix: string;
  secret: string;
  keyHash: string;
} {
  const secret = `${prefix}_${randomBytes(24).toString("hex")}`;
  return {
    prefix: secret.slice(0, 12),
    secret,
    keyHash: hashSecret(secret),
  };
}

async function main() {
  const definitions = await readContentTypeDefinitions();
  const siteSlug = "main-site";
  const adminPassword = process.env.ADMIN_DEMO_PASSWORD ?? "admin1234";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const [adminUser] = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: "admin@example.com" },
      update: {
        name: "Editorial Admin",
        image: null,
        passwordHash,
      },
      create: {
        email: "admin@example.com",
        name: "Editorial Admin",
        passwordHash,
      },
    });

    const site = await tx.site.upsert({
      where: { slug: siteSlug },
      update: {
        name: "Main Site",
      },
      create: {
        name: "Main Site",
        slug: siteSlug,
      },
    });

    await tx.siteMember.deleteMany({
      where: { siteId: site.id },
    });

    await tx.apiKey.deleteMany({
      where: { siteId: site.id },
    });

    await tx.content.deleteMany({
      where: { siteId: site.id },
    });

    await tx.contentModel.deleteMany({
      where: { siteId: site.id },
    });

    await tx.asset.deleteMany({
      where: { siteId: site.id },
    });

    await tx.siteMember.create({
      data: {
        siteId: site.id,
        userId: user.id,
        role: "owner",
      },
    });

    const publicKey = createApiKeySecret("public");
    const adminKey = createApiKeySecret("admin");

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

    const modelByApiName = new Map(
      await tx.contentModel
        .findMany({
          where: { siteId: site.id },
        })
        .then((rows) => rows.map((row) => [row.apiName, row] as const)),
    );

    const heroAsset = await tx.asset.create({
      data: {
        siteId: site.id,
        url: "https://example.com/assets/hero.jpg",
        filename: "hero.jpg",
        mimeType: "image/jpeg",
        size: 204800,
        width: 1600,
        height: 900,
        alt: "Hero image",
        createdBy: user.id,
      },
    });

    const topPageModel = modelByApiName.get("topPage");
    const pageModel = modelByApiName.get("page");
    const newsModel = modelByApiName.get("news");

    if (!topPageModel || !pageModel || !newsModel) {
      throw new Error("Seed content models were not created correctly.");
    }

    await tx.content.create({
      data: {
        siteId: site.id,
        modelId: topPageModel.id,
        title: "トップページ",
        status: "published",
        createdBy: user.id,
        updatedBy: user.id,
        publishedAt: new Date(),
        dataJson: {
          seo: {
            title: "Main Site",
            description: "Schema-driven headless CMS foundation.",
            ogTitle: "Main Site",
            ogDescription: "Schema-driven headless CMS foundation.",
            ogImage: heroAsset.url,
            canonicalUrl: "https://example.com/",
            noindex: false,
          },
          hero: {
            title: "Schema-driven headless CMS",
            lead: "A minimal CMS foundation for content creation and API delivery.",
            image: {
              url: heroAsset.url,
              alt: heroAsset.alt,
            },
            button: {
              label: "Contact",
              href: "/contact",
            },
          },
          sections: [
            {
              type: "textBlock",
              id: "sec_text_block_001",
              data: {
                title: "Headless by design",
                body: "<p>Content stays structured and delivery stays separate.</p>",
              },
            },
          ],
        },
      },
    });

    await tx.content.create({
      data: {
        siteId: site.id,
        modelId: pageModel.id,
        slug: "about",
        title: "About",
        status: "published",
        createdBy: user.id,
        updatedBy: user.id,
        publishedAt: new Date(),
        dataJson: {
          slug: "about",
          title: "About",
          summary: "会社紹介のサンプルページです。",
          sections: [
            {
              type: "titleGroup",
              id: "sec_title_group_001",
              data: {
                title: "About",
                lead: "会社概要やサービス紹介に使う下層ページ。",
              },
            },
          ],
          seo: {
            title: "About",
            description: "会社紹介のサンプルページです。",
            ogTitle: "About",
            ogDescription: "会社紹介のサンプルページです。",
            ogImage: heroAsset.url,
            canonicalUrl: "https://example.com/about",
            noindex: false,
          },
        },
      },
    });

    await tx.content.create({
      data: {
        siteId: site.id,
        modelId: newsModel.id,
        slug: "cms-foundation-launch",
        title: "CMS 基盤を公開",
        status: "published",
        createdBy: user.id,
        updatedBy: user.id,
        publishedAt: new Date(),
        dataJson: {
          slug: "cms-foundation-launch",
          title: "CMS 基盤を公開",
          summary: "Phase 1 のサンプルニュースです。",
          body: "<p>Next.js と Prisma を使ったヘッドレス CMS の土台を用意しました。</p>",
          publishedAt: new Date().toISOString(),
          coverImage: {
            url: heroAsset.url,
            alt: heroAsset.alt,
          },
          seo: {
            title: "CMS 基盤を公開",
            description: "Phase 1 のサンプルニュースです。",
            ogTitle: "CMS 基盤を公開",
            ogDescription: "Phase 1 のサンプルニュースです。",
            ogImage: heroAsset.url,
            canonicalUrl: "https://example.com/news/cms-foundation-launch",
            noindex: false,
          },
        },
      },
    });

    return [user, site] as const;
  });

  void adminUser;

  const exportResult = await exportSiteContent(siteSlug, { includeDraft: true });
  console.log(`Static preview export: ${exportResult.exported} file(s) for "${exportResult.siteSlug}"`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
