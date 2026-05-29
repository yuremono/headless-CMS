import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api-key", () => ({
  validateStoredApiKey: vi.fn(),
  validateStoredAdminApiKeyGlobal: vi.fn(),
}));

vi.mock("./session-bridge", () => ({
  resolveProductionSession: vi.fn(),
}));

vi.mock("./production-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./production-config")>();
  return {
    ...actual,
    getAuthProvider: vi.fn(),
  };
});

import {
  validateStoredAdminApiKeyGlobal,
  validateStoredApiKey,
} from "./api-key";
import { getAuthProvider } from "./production-config";
import { resolveProductionSession } from "./session-bridge";
import {
  authDevTokens,
  validateAdminAccess,
  validateAdminApiKey,
  validateGlobalAdminAccess,
  validatePreviewToken,
  validatePublicApiKey,
  validateSession,
} from "./index";

const mockedValidateStoredApiKey = vi.mocked(validateStoredApiKey);
const mockedValidateStoredAdminApiKeyGlobal = vi.mocked(validateStoredAdminApiKeyGlobal);
const mockedGetAuthProvider = vi.mocked(getAuthProvider);
const mockedResolveProductionSession = vi.mocked(resolveProductionSession);

const originalEnv = { ...process.env };

function adminHeaders(token = authDevTokens.admin): RequestInit {
  return { headers: { "x-admin-api-key": token } };
}

function sessionHeaders(token = authDevTokens.session): RequestInit {
  return { headers: { "x-session-token": token } };
}

describe("validatePublicApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.CMS_PUBLIC_API_KEY;
    mockedValidateStoredApiKey.mockResolvedValue(false);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("キー未指定時は 401 missing_api_key", async () => {
    const result = await validatePublicApiKey(new Request("https://example.com"), "site-1");

    expect(result).toEqual({
      ok: false,
      failure: { status: 401, code: "missing_api_key", error: "API key is required." },
    });
  });

  it("開発用フォールバックキーで認証成功", async () => {
    const result = await validatePublicApiKey(
      new Request("https://example.com", { headers: { "x-api-key": authDevTokens.public } }),
      "site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context).toMatchObject({
        mode: "public",
        siteId: "site-1",
        scope: "read",
      });
    }
  });

  it("Bearer トークンでも認証できる", async () => {
    const result = await validatePublicApiKey(
      new Request("https://example.com", {
        headers: { authorization: `Bearer ${authDevTokens.public}` },
      }),
      "site-1",
    );

    expect(result.ok).toBe(true);
  });

  it("DB 保存キーが有効なら env より優先", async () => {
    mockedValidateStoredApiKey.mockResolvedValue(true);

    const result = await validatePublicApiKey(
      new Request("https://example.com", { headers: { "x-api-key": "stored-key" } }),
      "site-1",
    );

    expect(result.ok).toBe(true);
    expect(mockedValidateStoredApiKey).toHaveBeenCalledWith("site-1", "stored-key", "public");
  });

  it("本番環境では開発用フォールバックを拒否", async () => {
    process.env.NODE_ENV = "production";

    const result = await validatePublicApiKey(
      new Request("https://example.com", { headers: { "x-api-key": authDevTokens.public } }),
      "site-1",
    );

    expect(result).toEqual({
      ok: false,
      failure: { status: 403, code: "invalid_api_key", error: "API key is invalid." },
    });
  });

  it("サイトスコープ env キーで検証する", async () => {
    process.env.CMS_PUBLIC_API_KEY_SITE_1 = "scoped-public-key";

    const ok = await validatePublicApiKey(
      new Request("https://example.com", { headers: { "x-api-key": "scoped-public-key" } }),
      "site-1",
    );
    const ng = await validatePublicApiKey(
      new Request("https://example.com", { headers: { "x-api-key": "wrong" } }),
      "site-1",
    );

    expect(ok.ok).toBe(true);
    expect(ng).toEqual({
      ok: false,
      failure: { status: 403, code: "invalid_api_key", error: "API key is invalid." },
    });
  });
});

describe("validateAdminApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    mockedValidateStoredApiKey.mockResolvedValue(false);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("開発用管理キーで write スコープを付与", async () => {
    const result = await validateAdminApiKey(
      new Request("https://example.com", adminHeaders()),
      "site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.scope).toBe("write");
      expect(result.context.mode).toBe("admin");
    }
  });
});

describe("validateSession", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.CMS_SESSION_TOKEN;
    mockedGetAuthProvider.mockReturnValue("none");
    mockedResolveProductionSession.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("本番 bridge が userId を返すとき AuthContext に付与", async () => {
    mockedGetAuthProvider.mockReturnValue("authjs");
    mockedResolveProductionSession.mockResolvedValue({
      userId: "user-abc",
      sessionToken: "prod-token",
    });

    const result = await validateSession(
      new Request("https://example.com", sessionHeaders("prod-token")),
      "site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.userId).toBe("user-abc");
      expect(result.context.actorId).toBe("user:user-abc");
    }
  });

  it("x-session-token ヘッダーで認証", async () => {
    const result = await validateSession(
      new Request("https://example.com", sessionHeaders()),
      "site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.mode).toBe("session");
    }
  });

  it("cms_session Cookie からトークンを読む", async () => {
    const result = await validateSession(
      new Request("https://example.com", {
        headers: { cookie: `other=1; cms_session=${authDevTokens.session}` },
      }),
      "site-1",
    );

    expect(result.ok).toBe(true);
  });

  it("セッション未指定は 401", async () => {
    const result = await validateSession(new Request("https://example.com"), "site-1");

    expect(result).toEqual({
      ok: false,
      failure: { status: 401, code: "missing_session", error: "Session is required." },
    });
  });
});

describe("validatePreviewToken", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.CMS_PREVIEW_TOKEN;
    delete process.env.PREVIEW_TOKEN_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("クエリ previewToken で認証", async () => {
    const result = await validatePreviewToken(
      new Request(`https://example.com?previewToken=${authDevTokens.preview}`),
      "site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.mode).toBe("preview");
      expect(result.context.scope).toBe("read");
    }
  });

  it("x-preview-token ヘッダーでも認証", async () => {
    const result = await validatePreviewToken(
      new Request("https://example.com", {
        headers: { "x-preview-token": authDevTokens.preview },
      }),
      "site-1",
    );

    expect(result.ok).toBe(true);
  });

  it("トークン未指定は 401", async () => {
    const result = await validatePreviewToken(new Request("https://example.com"), "site-1");

    expect(result).toEqual({
      ok: false,
      failure: { status: 401, code: "missing_preview_token", error: "Preview token is required." },
    });
  });

  it("PREVIEW_TOKEN_SECRET がある場合は署名付きトークンで認証", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    process.env.PREVIEW_TOKEN_SECRET = "test-secret";

    const { createSignedPreviewToken } = await import("../preview/signed-preview-token");
    const signed = createSignedPreviewToken("site-1");
    expect(signed).not.toBeNull();

    const result = await validatePreviewToken(
      new Request(`https://example.com?previewToken=${encodeURIComponent(signed!)}`),
      "site-1",
    );

    expect(result.ok).toBe(true);
    vi.useRealTimers();
  });

  it("CMS_PREVIEW_TOKEN 設定時は静的トークンを優先検証し dev fallback は使わない", async () => {
    process.env.CMS_PREVIEW_TOKEN = "static-preview";
    process.env.NODE_ENV = "development";

    const devResult = await validatePreviewToken(
      new Request(`https://example.com?previewToken=${authDevTokens.preview}`),
      "site-1",
    );
    expect(devResult.ok).toBe(false);

    const staticResult = await validatePreviewToken(
      new Request("https://example.com?previewToken=static-preview"),
      "site-1",
    );
    expect(staticResult.ok).toBe(true);
  });
});

describe("validateAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    mockedValidateStoredApiKey.mockResolvedValue(false);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("管理 API キーがあればセッション不要", async () => {
    const result = await validateAdminAccess(
      new Request("https://example.com", adminHeaders()),
      "site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.mode).toBe("admin");
    }
  });

  it("管理キーが無効ならセッションにフォールバック", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CMS_ADMIN_API_KEY;
    process.env.CMS_SESSION_TOKEN = authDevTokens.session;

    const result = await validateAdminAccess(
      new Request("https://example.com", sessionHeaders()),
      "site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.mode).toBe("session");
    }
  });
});

describe("validateGlobalAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.CMS_ADMIN_API_KEY;
    mockedValidateStoredAdminApiKeyGlobal.mockResolvedValue(false);
    mockedValidateStoredApiKey.mockResolvedValue(false);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("グローバル DB 管理キーで siteId=* を返す", async () => {
    mockedValidateStoredAdminApiKeyGlobal.mockResolvedValue(true);

    const result = await validateGlobalAdminAccess(
      new Request("https://example.com", adminHeaders("global-db-key")),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.siteId).toBe("*");
    }
  });

  it("API キーが無ければセッションで認証", async () => {
    const result = await validateGlobalAdminAccess(
      new Request("https://example.com", sessionHeaders()),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.mode).toBe("session");
    }
  });

  it("キーもセッションも無ければ 401", async () => {
    process.env.NODE_ENV = "production";

    const result = await validateGlobalAdminAccess(new Request("https://example.com"));

    expect(result).toEqual({
      ok: false,
      failure: { status: 401, code: "missing_api_key", error: "API key is required." },
    });
  });

  it("グローバル env 管理キーで認証", async () => {
    process.env.CMS_ADMIN_API_KEY = "global-env-key";

    const result = await validateGlobalAdminAccess(
      new Request("https://example.com", adminHeaders("global-env-key")),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.siteId).toBe("*");
    }
  });
});
