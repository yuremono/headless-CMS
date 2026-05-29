import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  authDevTokens: {
    preview: "preview-dev-token",
  },
}));

import { authDevTokens } from "@/lib/auth";
import { resolvePreviewToken } from "./get-preview-token";
import { isSignedPreviewTokenFormat } from "./signed-preview-token";

const originalEnv = { ...process.env };

describe("resolvePreviewToken", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.CMS_PREVIEW_TOKEN;
    delete process.env.CMS_PREVIEW_TOKEN_SITE_1;
    delete process.env.PREVIEW_TOKEN_SECRET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.useRealTimers();
  });

  it("PREVIEW_TOKEN_SECRET がある場合は署名付きトークンを返す", () => {
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";
    const token = resolvePreviewToken("site-1");

    expect(token).not.toBeNull();
    expect(isSignedPreviewTokenFormat(token!)).toBe(true);
  });

  it("CMS_PREVIEW_TOKEN が設定されている場合は静的トークンを返す", () => {
    process.env.CMS_PREVIEW_TOKEN = "static-token";
    expect(resolvePreviewToken("site-1")).toBe("static-token");
  });

  it("開発環境では dev fallback を返す", () => {
    process.env.NODE_ENV = "development";
    expect(resolvePreviewToken("site-1")).toBe(authDevTokens.preview);
  });

  it("本番で secret も静的トークンも無い場合は null", () => {
    process.env.NODE_ENV = "production";
    expect(resolvePreviewToken("site-1")).toBeNull();
  });
});
