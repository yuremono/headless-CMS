import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authProviderLabel, getAuthProvider, isAdminLoginEnforced } from "./production-config";

const originalEnv = { ...process.env };

describe("getAuthProvider", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CMS_AUTH_PROVIDER;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("未設定時は none", () => {
    expect(getAuthProvider()).toBe("none");
  });

  it("authjs / supabase を解釈する", () => {
    process.env.CMS_AUTH_PROVIDER = "authjs";
    expect(getAuthProvider()).toBe("authjs");

    process.env.CMS_AUTH_PROVIDER = "Supabase";
    expect(getAuthProvider()).toBe("supabase");
  });

  it("不明な値は none", () => {
    process.env.CMS_AUTH_PROVIDER = "oauth";
    expect(getAuthProvider()).toBe("none");
  });
});

describe("isAdminLoginEnforced", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CMS_ENFORCE_ADMIN_LOGIN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("true のときのみ強制", () => {
    expect(isAdminLoginEnforced()).toBe(false);

    process.env.CMS_ENFORCE_ADMIN_LOGIN = "true";
    expect(isAdminLoginEnforced()).toBe(true);

    process.env.CMS_ENFORCE_ADMIN_LOGIN = "false";
    expect(isAdminLoginEnforced()).toBe(false);
  });
});

describe("authProviderLabel", () => {
  it("表示ラベルを返す", () => {
    expect(authProviderLabel("authjs")).toBe("Auth.js");
    expect(authProviderLabel("supabase")).toBe("Supabase Auth");
    expect(authProviderLabel("none")).toBe("デモ（環境変数）");
  });
});
