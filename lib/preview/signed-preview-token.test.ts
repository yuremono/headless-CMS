import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSignedPreviewToken,
  hasPreviewTokenSecret,
  isSignedPreviewTokenFormat,
  verifySignedPreviewToken,
} from "./signed-preview-token";

const originalEnv = { ...process.env };

describe("signed preview token", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.PREVIEW_TOKEN_SECRET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.useRealTimers();
  });

  it("PREVIEW_TOKEN_SECRET 未設定時は署名トークンを生成しない", () => {
    expect(hasPreviewTokenSecret()).toBe(false);
    expect(createSignedPreviewToken("site-1")).toBeNull();
  });

  it("署名付きトークンを生成・検証できる", () => {
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";

    const token = createSignedPreviewToken("site-1");
    expect(token).not.toBeNull();
    expect(isSignedPreviewTokenFormat(token!)).toBe(true);
    expect(verifySignedPreviewToken(token!, "site-1")).toBe(true);
  });

  it("siteId が一致しない場合は拒否する", () => {
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";
    const token = createSignedPreviewToken("site-1");

    expect(verifySignedPreviewToken(token!, "site-2")).toBe(false);
  });

  it("期限切れトークンは拒否する", () => {
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";
    const token = createSignedPreviewToken("site-1", 60);

    vi.setSystemTime(new Date("2026-05-29T12:01:01.000Z"));
    expect(verifySignedPreviewToken(token!, "site-1")).toBe(false);
  });

  it("改ざんされた署名は拒否する", () => {
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";
    const token = createSignedPreviewToken("site-1")!;
    const parts = token.split(".");
    parts[3] = `${parts[3]}x`;
    const tampered = parts.join(".");

    expect(verifySignedPreviewToken(tampered, "site-1")).toBe(false);
  });

  it("静的トークン形式は署名検証の対象外", () => {
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";
    expect(verifySignedPreviewToken("preview-dev-token", "site-1")).toBe(false);
  });
});
