import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
  const adminAccess = await vi.importActual<typeof import("@/lib/auth/admin-access")>(
    "@/lib/auth/admin-access",
  );
  return {
    validateAdminAccess: vi.fn(),
    validateGlobalAdminAccess: vi.fn(),
    applySitePermission: adminAccess.applySitePermission,
    checkSitePermission: adminAccess.checkSitePermission,
  };
});

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

import { validateAdminAccess, validateGlobalAdminAccess } from "@/lib/auth";
import { resolveActorSiteRole, resolveGlobalActorRole } from "@/lib/auth/site-role";
import { resolveAdminRequest, resolveGlobalAdminRequest } from "./service";

const mockedAdminAuth = vi.mocked(validateAdminAccess);
const mockedGlobalAdminAuth = vi.mocked(validateGlobalAdminAccess);
const mockedResolveActorSiteRole = vi.mocked(resolveActorSiteRole);
const mockedResolveGlobalActorRole = vi.mocked(resolveGlobalActorRole);

const originalEnv = { ...process.env };

const okAuth = {
  ok: true as const,
  context: {
    mode: "session" as const,
    siteId: "site-1",
    token: "session-token",
    scope: "write" as const,
    actorId: "session:site-1",
  },
};

describe("PHASE3_ENFORCE_ROLES 有効時の resolveAdminRequest", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, PHASE3_ENFORCE_ROLES: "true" };
    mockedAdminAuth.mockResolvedValue(okAuth);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("viewer は content:read を許可", async () => {
    mockedResolveActorSiteRole.mockResolvedValue("viewer");

    const result = await resolveAdminRequest(new Request("https://example.com"), "site-1", {
      permission: "content:read",
    });

    expect(result.ok).toBe(true);
  });

  it("viewer は content:write を拒否", async () => {
    mockedResolveActorSiteRole.mockResolvedValue("viewer");

    const result = await resolveAdminRequest(new Request("https://example.com"), "site-1", {
      permission: "content:write",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.status).toBe(403);
      expect(result.failure.code).toBe("forbidden");
    }
  });

  it("editor は content:publish を許可", async () => {
    mockedResolveActorSiteRole.mockResolvedValue("editor");

    const result = await resolveAdminRequest(new Request("https://example.com"), "site-1", {
      permission: "content:publish",
    });

    expect(result.ok).toBe(true);
  });
});

describe("PHASE3_ENFORCE_ROLES 有効時の resolveGlobalAdminRequest", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, PHASE3_ENFORCE_ROLES: "true" };
    mockedGlobalAdminAuth.mockResolvedValue({
      ok: true,
      context: {
        mode: "session",
        siteId: "*",
        token: "session-token",
        scope: "write",
        actorId: "session:*",
      },
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("editor は site:write を拒否", async () => {
    mockedResolveGlobalActorRole.mockResolvedValue("editor");

    const result = await resolveGlobalAdminRequest(new Request("https://example.com"), {
      permission: "site:write",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.status).toBe(403);
    }
  });

  it("admin は site:write を許可", async () => {
    mockedResolveGlobalActorRole.mockResolvedValue("admin");

    const result = await resolveGlobalAdminRequest(new Request("https://example.com"), {
      permission: "site:write",
    });

    expect(result.ok).toBe(true);
  });
});

describe("PHASE3_ENFORCE_ROLES 無効時", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PHASE3_ENFORCE_ROLES;
    mockedAdminAuth.mockResolvedValue(okAuth);
    mockedResolveActorSiteRole.mockResolvedValue("viewer");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("viewer でも content:write を許可（従来互換）", async () => {
    const result = await resolveAdminRequest(new Request("https://example.com"), "site-1", {
      permission: "content:write",
    });

    expect(result.ok).toBe(true);
  });
});
