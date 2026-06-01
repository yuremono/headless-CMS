import type { Content, ContentModel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    contentModel: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    content: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";
import {
  createContent,
  deleteContent,
  duplicateContent,
  getContent,
  getSchema,
  listContents,
  listSchemas,
  publishContent,
  unpublishContent,
  updateContent,
  upsertSchema,
} from "./store";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedFindUnique = vi.mocked(prisma.contentModel.findUnique);
const mockedFindManyModels = vi.mocked(prisma.contentModel.findMany);
const mockedUpsert = vi.mocked(prisma.contentModel.upsert);
const mockedUpdateModel = vi.mocked(prisma.contentModel.update);
const mockedFindManyContents = vi.mocked(prisma.content.findMany);
const mockedCount = vi.mocked(prisma.content.count);
const mockedFindFirst = vi.mocked(prisma.content.findFirst);
const mockedCreate = vi.mocked(prisma.content.create);
const mockedUpdate = vi.mocked(prisma.content.update);
const mockedDeleteMany = vi.mocked(prisma.content.deleteMany);

const now = new Date("2026-05-29T00:00:00.000Z");

function makeModel(overrides: Partial<ContentModel> = {}): ContentModel {
  return {
    id: "model-news",
    siteId: "site-1",
    name: "お知らせ",
    apiName: "news",
    type: "collection",
    schemaJson: { fields: [] },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: "content-1",
    siteId: "site-1",
    modelId: "model-news",
    slug: "hello",
    title: "Hello",
    status: "published",
    dataJson: { title: "Hello", summary: "要約" },
    createdBy: "user-1",
    updatedBy: "user-1",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("listSchemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("サイト未解決時は空配列", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    expect(await listSchemas("unknown")).toEqual([]);
    expect(mockedFindManyModels).not.toHaveBeenCalled();
  });

  it("スキーマ一覧を apiName 昇順で返す", async () => {
    mockedFindManyModels.mockResolvedValue([makeModel(), makeModel({ id: "model-page", apiName: "page" })]);

    const schemas = await listSchemas("main-site");

    expect(schemas).toHaveLength(2);
    expect(schemas[0]?.apiName).toBe("news");
    expect(mockedFindManyModels).toHaveBeenCalledWith({
      where: { siteId: "site-1" },
      orderBy: { apiName: "asc" },
    });
  });
});

describe("upsertSchema / getSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("upsertSchema でスキーマを保存する", async () => {
    mockedUpsert.mockResolvedValue(makeModel());

    const result = await upsertSchema("site-1", {
      name: "お知らせ",
      apiName: "news",
      type: "collection",
      schemaJson: { fields: [] },
    });

    expect(result?.apiName).toBe("news");
    expect(mockedUpsert).toHaveBeenCalled();
  });

  it("getSchema は存在しない contentType で null", async () => {
    mockedFindUnique.mockResolvedValue(null);

    expect(await getSchema("site-1", "missing")).toBeNull();
  });

  it("getSchema はモデルをレコード形式で返す", async () => {
    mockedFindUnique.mockResolvedValue(makeModel());

    const schema = await getSchema("site-1", "news");

    expect(schema?.id).toBe("model-news");
  });
});

describe("listContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedFindUnique.mockResolvedValue(makeModel());
  });

  it("公開のみ取得時は status=published で絞る", async () => {
    mockedFindManyContents.mockResolvedValue([makeContent()]);
    mockedCount.mockResolvedValue(1);

    await listContents({
      siteId: "site-1",
      contentType: "news",
      includeDraft: false,
      limit: 20,
      offset: 0,
    });

    expect(mockedFindManyContents).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "published" }),
      }),
    );
  });

  it("includeDraft=true では status 条件を付けない", async () => {
    mockedFindManyContents.mockResolvedValue([]);
    mockedCount.mockResolvedValue(0);

    await listContents({
      siteId: "site-1",
      contentType: "news",
      includeDraft: true,
      limit: 10,
      offset: 5,
      slug: "hello",
    });

    expect(mockedFindManyContents).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siteId: "site-1",
          modelId: "model-news",
          slug: "hello",
        },
        skip: 5,
        take: 10,
      }),
    );
  });

  it("モデルが無い場合は空コレクション", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const result = await listContents({
      siteId: "site-1",
      contentType: "unknown",
      includeDraft: false,
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual({ items: [], total: 0, limit: 20, offset: 0 });
  });
});

describe("getContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedFindUnique.mockResolvedValue(makeModel());
  });

  it("下書きは includeDraft=false で null", async () => {
    mockedFindFirst.mockResolvedValue(makeContent({ status: "draft" }));

    expect(await getContent("site-1", "news", "content-1", false)).toBeNull();
  });

  it("slug でも id でも検索できる", async () => {
    mockedFindFirst.mockResolvedValue(makeContent());

    const record = await getContent("site-1", "news", "hello", true);

    expect(record?.slug).toBe("hello");
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: {
        siteId: "site-1",
        modelId: "model-news",
        OR: [{ id: "hello" }, { slug: "hello" }],
      },
    });
  });
});

describe("createContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedFindUnique.mockResolvedValue(makeModel());
  });

  it("dataJson.title からタイトルを推論する", async () => {
    mockedCreate.mockResolvedValue(makeContent({ title: "推論タイトル" }));

    await createContent("site-1", "news", {
      dataJson: { title: "推論タイトル" },
    });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "推論タイトル", status: "draft" }),
      }),
    );
  });

  it("published 作成時は publishedAt を設定", async () => {
    mockedCreate.mockResolvedValue(makeContent({ status: "published" }));

    await createContent("site-1", "news", { status: "published", title: "公開記事" });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "published",
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("不正 status は draft に正規化", async () => {
    mockedCreate.mockResolvedValue(makeContent());

    await createContent("site-1", "news", { status: "invalid" as never, title: "T" });

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "draft", publishedAt: null }),
      }),
    );
  });

  it("composableFieldFormats の richText を schema_json へマージし update する", async () => {
    mockedCreate.mockResolvedValue(makeContent());
    mockedUpdateModel.mockResolvedValue(makeModel());

    await createContent("site-1", "news", {
      title: "T",
      composableFieldFormats: { "hero.title": "richText", "hero.lead": "plain" },
    });

    expect(mockedUpdateModel).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "model-news" },
        data: expect.objectContaining({
          schemaJson: expect.objectContaining({
            composableFieldFormats: { "hero.title": "richText" },
          }),
        }),
      }),
    );
  });

  it("composableFieldFormats は指定時に現在値で置き換え、消えた richText を残さない", async () => {
    mockedFindUnique.mockResolvedValue(
      makeModel({ schemaJson: { fields: [], composableFieldFormats: { "old.title": "richText" } } }),
    );
    mockedCreate.mockResolvedValue(makeContent());
    mockedUpdateModel.mockResolvedValue(makeModel());

    await createContent("site-1", "news", {
      title: "T",
      composableFieldFormats: {},
    });

    expect(mockedUpdateModel).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schemaJson: expect.objectContaining({
            composableFieldFormats: {},
          }),
        }),
      }),
    );
  });

  it("composableFieldDirectories を schema_json へマージし dataJson には入れない", async () => {
    mockedFindUnique.mockResolvedValue(
      makeModel({ schemaJson: { fields: [], composableFieldFormats: { "hero.title": "richText" } } }),
    );
    mockedCreate.mockResolvedValue(makeContent());
    mockedUpdateModel.mockResolvedValue(makeModel());

    await createContent("site-1", "news", {
      title: "T",
      dataJson: { hero: { title: "見出し" } },
      composableFieldDirectories: {
        directories: [{ id: "hero", name: "ヒーロー", prefixes: ["hero"] }],
      },
    });

    expect(mockedUpdateModel).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "model-news" },
        data: expect.objectContaining({
          schemaJson: expect.objectContaining({
            composableFieldFormats: { "hero.title": "richText" },
            composableFieldDirectories: {
              directories: [{ id: "hero", name: "ヒーロー", prefixes: ["hero"] }],
            },
          }),
        }),
      }),
    );
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dataJson: { hero: { title: "見出し" } },
        }),
      }),
    );
  });

  it("composableFieldDirectories は空構造でも schema_json へ保存する", async () => {
    mockedCreate.mockResolvedValue(makeContent());
    mockedUpdateModel.mockResolvedValue(makeModel());

    await createContent("site-1", "news", {
      title: "T",
      composableFieldDirectories: { directories: [] },
    });

    expect(mockedUpdateModel).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schemaJson: expect.objectContaining({
            composableFieldDirectories: { directories: [] },
          }),
        }),
      }),
    );
  });

  it("format に変更が無ければ contentModel.update を呼ばない", async () => {
    mockedFindUnique.mockResolvedValue(
      makeModel({ schemaJson: { fields: [], composableFieldFormats: { "hero.title": "richText" } } }),
    );
    mockedCreate.mockResolvedValue(makeContent());

    await createContent("site-1", "news", {
      title: "T",
      composableFieldFormats: { "hero.title": "richText" },
    });

    expect(mockedUpdateModel).not.toHaveBeenCalled();
  });
});

describe("updateContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedFindUnique.mockResolvedValue(makeModel());
    mockedFindFirst.mockResolvedValue(makeContent({ status: "draft", publishedAt: null }));
    mockedUpdate.mockImplementation(async ({ data }) =>
      makeContent({
        slug: data.slug as string,
        title: data.title as string,
        status: data.status as Content["status"],
        publishedAt: data.publishedAt as Date | null,
      }),
    );
  });

  it("存在しないコンテンツは null", async () => {
    mockedFindFirst.mockResolvedValue(null);

    expect(await updateContent("site-1", "news", "missing", { title: "X" })).toBeNull();
  });

  it("公開に更新すると publishedAt を付与", async () => {
    const record = await updateContent("site-1", "news", "content-1", { status: "published" });

    expect(record?.status).toBe("published");
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "published",
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("draft に戻すと publishedAt を null にする", async () => {
    mockedFindFirst.mockResolvedValue(makeContent({ status: "published", publishedAt: now }));

    await updateContent("site-1", "news", "content-1", { status: "draft" });

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ publishedAt: null }),
      }),
    );
  });
});

describe("deleteContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedFindUnique.mockResolvedValue(makeModel());
  });

  it("削除成功時 true", async () => {
    mockedDeleteMany.mockResolvedValue({ count: 1 });

    expect(await deleteContent("site-1", "news", "content-1")).toBe(true);
  });

  it("対象が無ければ false", async () => {
    mockedDeleteMany.mockResolvedValue({ count: 0 });

    expect(await deleteContent("site-1", "news", "missing")).toBe(false);
  });
});

describe("publishContent / unpublishContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedFindUnique.mockResolvedValue(makeModel());
    mockedFindFirst.mockResolvedValue(makeContent({ status: "draft", publishedAt: null }));
  });

  it("publish で status と publishedAt を更新", async () => {
    mockedUpdate.mockResolvedValue(makeContent({ status: "published", publishedAt: now }));

    const record = await publishContent("site-1", "news", "content-1", "actor-1");

    expect(record?.status).toBe("published");
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "published",
          updatedBy: "actor-1",
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("unpublish で status を unpublished にする", async () => {
    mockedUpdate.mockResolvedValue(makeContent({ status: "unpublished" }));

    const record = await unpublishContent("site-1", "news", "content-1");

    expect(record?.status).toBe("unpublished");
  });
});

describe("duplicateContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedFindUnique.mockResolvedValue(makeModel());
    mockedFindFirst.mockResolvedValue(
      makeContent({ slug: "hello-copy-abc", title: "Hello", status: "published" }),
    );
  });

  it("コピーは draft として slug/title を変換", async () => {
    mockedCreate.mockImplementation(async ({ data }) =>
      makeContent({
        id: "content-copy",
        slug: data.slug as string,
        title: data.title as string,
        status: "draft",
        publishedAt: null,
      }),
    );

    const copy = await duplicateContent("site-1", "news", "content-1", "actor-2");

    expect(copy?.status).toBe("draft");
    expect(copy?.title).toContain("(コピー)");
    expect(copy?.slug).toMatch(/^hello-copy-/);
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "draft",
          publishedAt: null,
          createdBy: "actor-2",
        }),
      }),
    );
  });

  it("元コンテンツが無ければ null", async () => {
    mockedFindFirst.mockResolvedValue(null);

    expect(await duplicateContent("site-1", "news", "missing")).toBeNull();
  });
});

describe("サイト未解決時の早期 return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue(null);
  });

  it("createContent は null", async () => {
    expect(await createContent("unknown", "news", { title: "T" })).toBeNull();
  });

  it("upsertSchema は null", async () => {
    expect(
      await upsertSchema("unknown", {
        name: "N",
        apiName: "news",
        type: "collection",
        schemaJson: {},
      }),
    ).toBeNull();
  });

  it("getContent は null", async () => {
    expect(await getContent("unknown", "news", "id", true)).toBeNull();
  });
});
