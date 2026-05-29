import type { Content, ContentModel, User } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  toAdminContentRecord,
  toAdminContentTypeDefinition,
  toContentModelRecord,
  toContentRecord,
} from "./mappers";

const now = new Date("2026-05-29T00:00:00.000Z");

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: "content-1",
    siteId: "site-1",
    contentModelId: "model-1",
    slug: "hello-world",
    title: "Hello",
    status: "published",
    dataJson: { summary: "要約テキスト" },
    createdBy: "user-1",
    updatedBy: "user-1",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeContentModel(overrides: Partial<ContentModel> = {}): ContentModel {
  return {
    id: "model-1",
    siteId: "site-1",
    name: "お知らせ",
    apiName: "news",
    type: "collection",
    schemaJson: { description: "ニュース記事", fields: [] },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "admin@example.com",
    name: "Admin User",
    emailVerified: null,
    image: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("toContentModelRecord", () => {
  it("ContentModel を API 向けレコードに変換する", () => {
    const record = toContentModelRecord(makeContentModel());

    expect(record).toEqual({
      id: "model-1",
      siteId: "site-1",
      name: "お知らせ",
      apiName: "news",
      type: "collection",
      schemaJson: { description: "ニュース記事", fields: [] },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it("schemaJson がオブジェクトでない場合は空オブジェクトにする", () => {
    const record = toContentModelRecord(makeContentModel({ schemaJson: null }));
    expect(record.schemaJson).toEqual({});
  });
});

describe("toContentRecord", () => {
  it("Content を配信 API 向けレコードに変換する", () => {
    const record = toContentRecord(makeContent(), "news");

    expect(record.contentType).toBe("news");
    expect(record.status).toBe("published");
    expect(record.dataJson).toEqual({ summary: "要約テキスト" });
    expect(record.publishedAt).toBe(now.toISOString());
  });

  it("未知の status は draft に正規化する", () => {
    const record = toContentRecord(makeContent({ status: "archived" }), "news");
    expect(record.status).toBe("draft");
  });

  it("dataJson がオブジェクトでない場合は空オブジェクトにする", () => {
    const record = toContentRecord(makeContent({ dataJson: "invalid" }), "news");
    expect(record.dataJson).toEqual({});
  });
});

describe("toAdminContentRecord", () => {
  it("summary を dataJson.summary から抽出する", () => {
    const record = toAdminContentRecord(makeContent(), "news", makeUser());
    expect(record.summary).toBe("要約テキスト");
    expect(record.author).toBe("Admin User");
    expect(record.slug).toBe("hello-world");
  });

  it("summary が無い場合 seo.description を使う", () => {
    const record = toAdminContentRecord(
      makeContent({ dataJson: { seo: { description: "SEO説明" } } }),
      "news",
    );
    expect(record.summary).toBe("SEO説明");
  });

  it("summary が無い場合 hero.lead を使う", () => {
    const record = toAdminContentRecord(
      makeContent({ dataJson: { hero: { lead: "リード文" } } }),
      "news",
    );
    expect(record.summary).toBe("リード文");
  });

  it("creator が無い場合 author は Admin", () => {
    const record = toAdminContentRecord(makeContent(), "news");
    expect(record.author).toBe("Admin");
  });

  it("creator に name が無い場合 email を author に使う", () => {
    const record = toAdminContentRecord(makeContent(), "news", makeUser({ name: null }));
    expect(record.author).toBe("admin@example.com");
  });
});

describe("toAdminContentTypeDefinition", () => {
  it("ContentModel を管理画面向け定義に変換する", () => {
    const definition = toAdminContentTypeDefinition(makeContentModel());

    expect(definition).toEqual({
      slug: "news",
      label: "お知らせ",
      kind: "collection",
      description: "ニュース記事",
      schemaJson: { description: "ニュース記事", fields: [] },
    });
  });

  it("schemaJson.description が無い場合 name を description に使う", () => {
    const definition = toAdminContentTypeDefinition(
      makeContentModel({ schemaJson: { fields: [] } }),
    );
    expect(definition.description).toBe("お知らせ");
  });
});
