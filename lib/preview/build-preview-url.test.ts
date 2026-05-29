import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  authDevTokens: {
    public: "public-dev-key",
    admin: "admin-dev-key",
    preview: "preview-dev-token",
    session: "session-dev-token",
  },
}));

import { authDevTokens } from "@/lib/auth";
import { buildPreviewUrl, getFrontendBaseUrl } from "./build-preview-url";

describe("getFrontendBaseUrl", () => {
  const originalEnv = process.env.FRONTEND_BASE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FRONTEND_BASE_URL;
    } else {
      process.env.FRONTEND_BASE_URL = originalEnv;
    }
  });

  it("FRONTEND_BASE_URL が設定されている場合はその値を返す", () => {
    process.env.FRONTEND_BASE_URL = "https://preview.example.com";
    expect(getFrontendBaseUrl()).toBe("https://preview.example.com");
  });

  it("FRONTEND_BASE_URL が空の場合は null を返す", () => {
    process.env.FRONTEND_BASE_URL = "   ";
    expect(getFrontendBaseUrl()).toBeNull();
  });

  it("FRONTEND_BASE_URL が未設定の場合は null を返す", () => {
    delete process.env.FRONTEND_BASE_URL;
    expect(getFrontendBaseUrl()).toBeNull();
  });
});

describe("buildPreviewUrl", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot, NODE_ENV: "test" };
    process.env.FRONTEND_BASE_URL = "https://preview.example.com";
    delete process.env.CMS_PREVIEW_TOKEN;
    delete process.env.CMS_PREVIEW_TOKEN_SITE_1;
    delete process.env.PREVIEW_TOKEN_SECRET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
  });

  afterEach(() => {
    process.env = envSnapshot;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("FRONTEND_BASE_URL が無い場合は null を返す", () => {
    delete process.env.FRONTEND_BASE_URL;
    expect(
      buildPreviewUrl({
        siteId: "site-1",
        contentType: "news",
        kind: "collection",
        slug: "hello",
      }),
    ).toBeNull();
  });

  it("collection 種別では slug をクエリに含める", () => {
    const url = buildPreviewUrl({
      siteId: "site-1",
      contentType: "news",
      kind: "collection",
      slug: "hello-world",
      previewToken: "token-123",
    });

    expect(url).toBe(
      "https://preview.example.com/?siteId=site-1&contentType=news&previewToken=token-123&slug=hello-world",
    );
  });

  it("single 種別では contentId をクエリに含める", () => {
    const url = buildPreviewUrl({
      siteId: "site-1",
      contentType: "topPage",
      kind: "single",
      contentId: "content-abc",
      previewToken: "token-123",
    });

    expect(url).toBe(
      "https://preview.example.com/?siteId=site-1&contentType=topPage&previewToken=token-123&contentId=content-abc",
    );
  });

  it("previewToken 未指定時は resolvePreviewToken の結果を使う", () => {
    process.env.CMS_PREVIEW_TOKEN = "env-token";
    const url = buildPreviewUrl({
      siteId: "site-1",
      contentType: "news",
      kind: "collection",
      slug: "hello",
    });

    expect(url).toContain("previewToken=env-token");
  });

  it("base URL の末尾スラッシュを正規化する", () => {
    process.env.FRONTEND_BASE_URL = "https://preview.example.com/";
    const url = buildPreviewUrl({
      siteId: "site-1",
      contentType: "news",
      kind: "collection",
      slug: "hello",
      previewToken: "token-123",
    });

    expect(url).toMatch(/^https:\/\/preview\.example\.com\/\?/);
  });

  it("本番でトークンが解決できない場合は null を返す", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CMS_PREVIEW_TOKEN;

    expect(
      buildPreviewUrl({
        siteId: "site-1",
        contentType: "news",
        kind: "collection",
        slug: "hello",
      }),
    ).toBeNull();
  });

  it("開発環境では dev fallback トークンで URL を組み立てる", () => {
    process.env.NODE_ENV = "development";
    delete process.env.CMS_PREVIEW_TOKEN;

    const url = buildPreviewUrl({
      siteId: "site-1",
      contentType: "news",
      kind: "collection",
      slug: "hello",
    });

    expect(url).toContain(`previewToken=${authDevTokens.preview}`);
  });

  it("PREVIEW_TOKEN_SECRET がある場合は署名付きトークンで URL を組み立てる", () => {
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";

    const url = buildPreviewUrl({
      siteId: "site-1",
      contentType: "news",
      kind: "collection",
      slug: "hello",
    });

    expect(url).toMatch(/previewToken=pt\.v1\./);
  });
});
