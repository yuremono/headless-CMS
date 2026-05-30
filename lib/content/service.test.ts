import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validatePublicApiKey: vi.fn(),
  validatePreviewToken: vi.fn(),
  validateAdminAccess: vi.fn(),
  validateGlobalAdminAccess: vi.fn(),
  applySitePermission: vi.fn(),
}));

vi.mock("@/lib/auth/site-role", () => ({
  resolveActorSiteRole: vi.fn(),
  resolveGlobalActorRole: vi.fn(),
}));

vi.mock("@/lib/content/store", () => ({
  listSchemas: vi.fn(),
  getSchema: vi.fn(),
  listContents: vi.fn(),
  getContent: vi.fn(),
  createContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
  publishContent: vi.fn(),
  unpublishContent: vi.fn(),
  duplicateContent: vi.fn(),
}));

vi.mock("@/lib/db/sites", () => ({
  listAdminContentTypes: vi.fn(),
  listAdminContents: vi.fn(),
  getAdminContent: vi.fn(),
}));

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

vi.mock("@/lib/db/assets", () => ({
  listAssets: vi.fn(),
  updateAsset: vi.fn(),
}));

import {
  applySitePermission,
  validateAdminAccess,
  validateGlobalAdminAccess,
  validatePreviewToken,
  validatePublicApiKey,
} from "@/lib/auth";
import { resolveActorSiteRole, resolveGlobalActorRole } from "@/lib/auth/site-role";
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
} from "@/lib/content/store";
import { listAssets, updateAsset } from "@/lib/db/assets";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { getAdminContent, listAdminContentTypes, listAdminContents } from "@/lib/db/sites";
import {
  createAdminContent,
  getAdminAssets,
  getAdminContentRecord,
  getAdminContentTypes,
  getDeliveryContent,
  getFieldManifest,
  getSchemaByType,
  getSchemas,
  listAdminContents as listAdminContentsService,
  listAdminContentsUi,
  listDeliveryContents,
  patchAdminAsset,
  duplicateAdminContent,
  publishAdminContent,
  removeAdminContent,
  resolveAdminRequest,
  resolveDeliveryRequest,
  resolveGlobalAdminRequest,
  unpublishAdminContent,
  updateAdminContent,
} from "./service";

const mockedPublicAuth = vi.mocked(validatePublicApiKey);
const mockedPreviewAuth = vi.mocked(validatePreviewToken);
const mockedAdminAuth = vi.mocked(validateAdminAccess);
const mockedGlobalAdminAuth = vi.mocked(validateGlobalAdminAccess);
const mockedResolveActorSiteRole = vi.mocked(resolveActorSiteRole);
const mockedResolveGlobalActorRole = vi.mocked(resolveGlobalActorRole);
const mockedApplySitePermission = vi.mocked(applySitePermission);
const mockedListSchemas = vi.mocked(listSchemas);
const mockedGetSchema = vi.mocked(getSchema);
const mockedListContents = vi.mocked(listContents);
const mockedGetContent = vi.mocked(getContent);
const mockedCreateContent = vi.mocked(createContent);
const mockedUpdateContent = vi.mocked(updateContent);
const mockedDeleteContent = vi.mocked(deleteContent);
const mockedPublishContent = vi.mocked(publishContent);
const mockedUnpublishContent = vi.mocked(unpublishContent);
const mockedDuplicateContent = vi.mocked(duplicateContent);
const mockedListAdminTypes = vi.mocked(listAdminContentTypes);
const mockedListAdminContentsUi = vi.mocked(listAdminContents);
const mockedGetAdminContent = vi.mocked(getAdminContent);
const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedListAssets = vi.mocked(listAssets);
const mockedUpdateAsset = vi.mocked(updateAsset);

const okAuth = {
  ok: true as const,
  context: {
    mode: "admin" as const,
    siteId: "site-1",
    token: "token",
    scope: "write" as const,
    actorId: "admin:site-1",
  },
};

const sampleRecord = {
  id: "content-1",
  siteId: "site-1",
  contentType: "news",
  slug: "hello",
  title: "Hello",
  status: "draft" as const,
  dataJson: { summary: "要約" },
  createdBy: "user-1",
  updatedBy: "user-1",
  publishedAt: null,
  createdAt: "2026-05-29T00:00:00.000Z",
  updatedAt: "2026-05-29T00:00:00.000Z",
};

describe("resolveDeliveryRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("公開 API キー失敗時はその認証結果を返す", async () => {
    mockedPublicAuth.mockResolvedValue({
      ok: false,
      failure: { status: 401, code: "missing_api_key", error: "API key is required." },
    });

    const result = await resolveDeliveryRequest(
      new Request("https://example.com"),
      "site-1",
      new URLSearchParams(),
    );

    expect(result.auth.ok).toBe(false);
    expect(result.includeDraft).toBe(false);
  });

  it("draft なしでは公開認証のみで成功", async () => {
    mockedPublicAuth.mockResolvedValue(okAuth);

    const result = await resolveDeliveryRequest(
      new Request("https://example.com"),
      "site-1",
      new URLSearchParams(),
    );

    expect(result.auth.ok).toBe(true);
    expect(result.includeDraft).toBe(false);
    expect(mockedPreviewAuth).not.toHaveBeenCalled();
  });

  it("draft=true ではプレビュートークンを検証する", async () => {
    mockedPublicAuth.mockResolvedValue(okAuth);
    mockedPreviewAuth.mockResolvedValue(okAuth);

    const result = await resolveDeliveryRequest(
      new Request("https://example.com"),
      "site-1",
      new URLSearchParams("draft=true"),
    );

    expect(result.includeDraft).toBe(true);
    expect(mockedPreviewAuth).toHaveBeenCalled();
  });
});

describe("resolveAdminRequest / resolveGlobalAdminRequest", () => {
  beforeEach(() => {
    mockedResolveActorSiteRole.mockResolvedValue("owner");
    mockedResolveGlobalActorRole.mockResolvedValue("owner");
    mockedApplySitePermission.mockImplementation((auth, siteRole) => ({
      ok: true,
      context: { ...auth.context, siteRole },
    }));
  });

  it("管理 API 認証・ロール解決・権限適用を行う", async () => {
    mockedAdminAuth.mockResolvedValue(okAuth);

    const result = await resolveAdminRequest(new Request("https://example.com"), "site-1", {
      permission: "content:write",
    });

    expect(mockedAdminAuth).toHaveBeenCalled();
    expect(mockedResolveActorSiteRole).toHaveBeenCalledWith("site-1", okAuth.context);
    expect(mockedApplySitePermission).toHaveBeenCalledWith(okAuth, "owner", "content:write");
    expect(result.ok).toBe(true);
  });

  it("グローバル管理認証・ロール解決・権限適用を行う", async () => {
    mockedGlobalAdminAuth.mockResolvedValue(okAuth);

    const result = await resolveGlobalAdminRequest(new Request("https://example.com"), {
      permission: "site:write",
    });

    expect(mockedGlobalAdminAuth).toHaveBeenCalled();
    expect(mockedResolveGlobalActorRole).toHaveBeenCalledWith(okAuth.context);
    expect(mockedApplySitePermission).toHaveBeenCalledWith(okAuth, "owner", "site:write");
    expect(result.ok).toBe(true);
  });
});

describe("schema and delivery helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getSchemas / getSchemaByType は store を呼ぶ", async () => {
    mockedListSchemas.mockResolvedValue([]);
    mockedGetSchema.mockResolvedValue(null);

    await getSchemas("site-1");
    await getSchemaByType("site-1", "news");

    expect(mockedListSchemas).toHaveBeenCalledWith("site-1");
    expect(mockedGetSchema).toHaveBeenCalledWith("site-1", "news");
  });

  it("listDeliveryContents は includeDraft を渡す", async () => {
    mockedListContents.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    await listDeliveryContents("site-1", "news", new URLSearchParams("limit=5"), true);

    expect(mockedListContents).toHaveBeenCalledWith(
      expect.objectContaining({ includeDraft: true, limit: 5 }),
    );
  });

  it("getDeliveryContent は store.getContent を呼ぶ", async () => {
    mockedGetContent.mockResolvedValue(sampleRecord);

    const record = await getDeliveryContent("site-1", "news", "hello", false);

    expect(record?.slug).toBe("hello");
  });
});

describe("admin content helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateContent.mockResolvedValue(sampleRecord);
    mockedUpdateContent.mockResolvedValue(sampleRecord);
    mockedDeleteContent.mockResolvedValue(true);
    mockedPublishContent.mockResolvedValue(sampleRecord);
    mockedUnpublishContent.mockResolvedValue(sampleRecord);
    mockedDuplicateContent.mockResolvedValue(sampleRecord);
    mockedListAdminTypes.mockResolvedValue([]);
    mockedListAdminContentsUi.mockResolvedValue([]);
    mockedGetAdminContent.mockResolvedValue(null);
    mockedListContents.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
  });

  it("getAdminContentTypes は db.sites を呼ぶ", async () => {
    await getAdminContentTypes("site-1");
    expect(mockedListAdminTypes).toHaveBeenCalledWith("site-1");
  });

  it("createAdminContent は body から dataJson を抽出する", async () => {
    await createAdminContent("site-1", "news", {
      slug: "  hello  ",
      title: "Title",
      status: "draft",
      summary: "要約",
    }, "actor-1");

    expect(mockedCreateContent).toHaveBeenCalledWith(
      "site-1",
      "news",
      expect.objectContaining({
        slug: "hello",
        title: "Title",
        dataJson: { summary: "要約" },
        createdBy: "actor-1",
      }),
    );
  });

  it("createAdminContent は非オブジェクト body で null", async () => {
    expect(await createAdminContent("site-1", "news", null, "actor")).toBeNull();
  });

  it("createAdminContent は fieldFormats を正規化して composableFieldFormats へ渡す", async () => {
    await createAdminContent(
      "site-1",
      "news",
      {
        summary: "要約",
        fieldFormats: { "hero.title": "richText", "hero.lead": "plain", "hero.bad": "x" },
      },
      "actor-1",
    );

    expect(mockedCreateContent).toHaveBeenCalledWith(
      "site-1",
      "news",
      expect.objectContaining({
        composableFieldFormats: { "hero.title": "richText", "hero.lead": "plain" },
      }),
    );
  });

  it("updateAdminContent は fieldFormats 不在時 composableFieldFormats=undefined", async () => {
    await updateAdminContent(
      "site-1",
      "news",
      "content-1",
      { dataJson: { summary: "更新" } },
      "actor-1",
    );

    expect(mockedUpdateContent).toHaveBeenCalledWith(
      "site-1",
      "news",
      "content-1",
      expect.objectContaining({ composableFieldFormats: undefined }),
    );
  });

  it("updateAdminContent は dataJson ネストを優先する", async () => {
    await updateAdminContent(
      "site-1",
      "news",
      "content-1",
      { dataJson: { summary: "更新" } },
      "actor-1",
    );

    expect(mockedUpdateContent).toHaveBeenCalledWith(
      "site-1",
      "news",
      "content-1",
      expect.objectContaining({ dataJson: { summary: "更新" } }),
    );
  });

  it("remove / publish / unpublish / duplicate を委譲する", async () => {
    await removeAdminContent("site-1", "news", "content-1");
    await publishAdminContent("site-1", "news", "content-1", "actor");
    await unpublishAdminContent("site-1", "news", "content-1", "actor");
    await duplicateAdminContent("site-1", "news", "content-1", "actor");

    expect(mockedDeleteContent).toHaveBeenCalled();
    expect(mockedPublishContent).toHaveBeenCalled();
    expect(mockedUnpublishContent).toHaveBeenCalled();
    expect(mockedDuplicateContent).toHaveBeenCalled();
  });

  it("listAdminContentsUi / getAdminContentRecord を委譲する", async () => {
    await listAdminContentsUi("site-1", "news");
    await getAdminContentRecord("site-1", "news", "content-1");

    expect(mockedListAdminContentsUi).toHaveBeenCalled();
    expect(mockedGetAdminContent).toHaveBeenCalled();
  });

  it("listAdminContents は includeDraft=true", async () => {
    await listAdminContentsService("site-1", "news", new URLSearchParams());

    expect(mockedListContents).toHaveBeenCalledWith(
      expect.objectContaining({ includeDraft: true }),
    );
  });
});

describe("getFieldManifest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("id 指定時は対象コンテンツの dataJson からパスを収集する", async () => {
    mockedGetSchema.mockResolvedValue({
      siteId: "site-1",
      contentType: "news",
      schemaJson: { composableFieldFormats: { "hero.title": "richText" } },
    } as never);
    mockedGetContent.mockResolvedValue({
      ...sampleRecord,
      dataJson: { hero: { title: "<span>T</span>", lead: "リード" } },
    });

    const manifest = await getFieldManifest("site-1", "news", "content-1");

    expect(mockedGetContent).toHaveBeenCalledWith("site-1", "news", "content-1", true);
    expect(manifest.contentType).toBe("news");
    const titleEntry = manifest.paths.find((f) => f.path === "hero.title");
    expect(titleEntry?.format).toBe("richText");
  });

  it("id 未指定時は最新 1 件のデータを使う", async () => {
    mockedGetSchema.mockResolvedValue({
      siteId: "site-1",
      contentType: "news",
      schemaJson: {},
    } as never);
    mockedListContents.mockResolvedValue({
      items: [{ ...sampleRecord, dataJson: { title: "最新" } }],
      total: 1,
      limit: 1,
      offset: 0,
    });

    const manifest = await getFieldManifest("site-1", "news");

    expect(mockedListContents).toHaveBeenCalledWith(
      expect.objectContaining({ includeDraft: true, limit: 1 }),
    );
    expect(manifest.paths.some((f) => f.path === "title")).toBe(true);
  });
});

describe("getAdminAssets / patchAdminAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サイト未解決時は null", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    expect(await getAdminAssets("unknown", new URLSearchParams())).toBeNull();
  });

  it("アセット一覧を返す", async () => {
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedListAssets.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });

    await getAdminAssets("main-site", new URLSearchParams({ limit: "10" }));

    expect(mockedListAssets).toHaveBeenCalledWith("site-1", { limit: 10, offset: 0 });
  });

  it("patchAdminAsset は alt 必須", async () => {
    mockedResolveSiteId.mockResolvedValue("site-1");

    const missing = await patchAdminAsset("main-site", "asset-1", {});
    expect(missing).toEqual({ error: "missing_alt", status: 400 });
  });

  it("patchAdminAsset は存在しないアセットで 404", async () => {
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedUpdateAsset.mockResolvedValue(null);

    const result = await patchAdminAsset("main-site", "asset-1", { alt: "New alt" });

    expect(result).toEqual({ error: "not_found", status: 404 });
  });

  it("patchAdminAsset 成功時は asset を返す", async () => {
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedUpdateAsset.mockResolvedValue({
      id: "asset-1",
      siteId: "site-1",
      url: "/uploads/site-1/a.jpg",
      filename: "a.jpg",
      mimeType: "image/jpeg",
      size: 10,
      width: null,
      height: null,
      alt: "Alt",
      createdBy: null,
      createdAt: "2026-05-29T00:00:00.000Z",
    });

    const result = await patchAdminAsset("main-site", "asset-1", { alt: "Alt" });

    expect(result).toMatchObject({ asset: expect.objectContaining({ alt: "Alt" }) });
  });
});
