import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectUrl,
  hasCmsSessionToken,
  isAdminUiPath,
  isPublicAdminPath,
} from "./admin-route-guard";

describe("isAdminUiPath", () => {
  it("管理 UI パスを判定する", () => {
    expect(isAdminUiPath("/")).toBe(true);
    expect(isAdminUiPath("/sites/demo")).toBe(true);
    expect(isAdminUiPath("/login")).toBe(true);
  });

  it("API と Next 内部は除外", () => {
    expect(isAdminUiPath("/api/admin/sites")).toBe(false);
    expect(isAdminUiPath("/_next/static/chunk.js")).toBe(false);
    expect(isAdminUiPath("/favicon.ico")).toBe(false);
  });
});

describe("isPublicAdminPath", () => {
  it("/login のみ公開", () => {
    expect(isPublicAdminPath("/login")).toBe(true);
    expect(isPublicAdminPath("/")).toBe(false);
  });
});

describe("hasCmsSessionToken", () => {
  it("x-session-token ヘッダーで true", () => {
    const request = new Request("https://example.com", {
      headers: { "x-session-token": "token-1" },
    });
    expect(hasCmsSessionToken(request)).toBe(true);
  });

  it("cms_session Cookie で true", () => {
    const request = new Request("https://example.com", {
      headers: { cookie: "other=1; cms_session=token-2" },
    });
    expect(hasCmsSessionToken(request)).toBe(true);
  });

  it("セッション無しは false", () => {
    expect(hasCmsSessionToken(new Request("https://example.com"))).toBe(false);
  });
});

describe("buildLoginRedirectUrl", () => {
  it("redirect クエリを付与する", () => {
    const url = buildLoginRedirectUrl("https://example.com/sites/demo", "/sites/demo");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirect")).toBe("/sites/demo");
  });

  it("/login 自身では redirect を付けない", () => {
    const url = buildLoginRedirectUrl("https://example.com/login", "/login");
    expect(url.searchParams.has("redirect")).toBe(false);
  });
});
