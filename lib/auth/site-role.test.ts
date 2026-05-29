import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    siteMember: { findUnique: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { authDevTokens } from "./index";
import { resolveActorSiteRole, resolveGlobalActorRole } from "./site-role";

const mockedSiteMember = vi.mocked(prisma.siteMember.findUnique);
const mockedSiteMembers = vi.mocked(prisma.siteMember.findMany);
const mockedUser = vi.mocked(prisma.user.findUnique);
const mockedResolveSiteId = vi.mocked(resolveSiteId);

const originalEnv = { ...process.env };

function sessionContext(token = authDevTokens.session) {
  return {
    mode: "session" as const,
    siteId: "site-1",
    token,
    scope: "write" as const,
    actorId: "session:site-1",
  };
}

describe("resolveActorSiteRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    mockedResolveSiteId.mockResolvedValue("site-db-1");
    mockedUser.mockResolvedValue({ id: "user-1" } as never);
    mockedSiteMember.mockResolvedValue({ role: "viewer" } as never);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("管理 API キー認証は owner 相当", async () => {
    const role = await resolveActorSiteRole("site-1", {
      mode: "admin",
      siteId: "site-1",
      token: "admin-key",
      scope: "write",
      actorId: "admin:site-1",
    });

    expect(role).toBe("owner");
    expect(mockedSiteMember).not.toHaveBeenCalled();
  });

  it("開発用デモセッションは owner 相当（デモログイン維持）", async () => {
    const role = await resolveActorSiteRole("site-1", sessionContext());

    expect(role).toBe("owner");
    expect(mockedSiteMember).not.toHaveBeenCalled();
  });

  it("本番セッションは site_members を参照", async () => {
    process.env.NODE_ENV = "production";
    process.env.CMS_SESSION_TOKEN = "prod-session";

    const role = await resolveActorSiteRole("site-1", sessionContext("prod-session"));

    expect(role).toBe("viewer");
    expect(mockedSiteMember).toHaveBeenCalledWith({
      where: { siteId_userId: { siteId: "site-db-1", userId: "user-1" } },
      select: { role: true },
    });
  });

  it("メンバー未登録時は editor にフォールバック", async () => {
    process.env.NODE_ENV = "production";
    process.env.CMS_SESSION_TOKEN = "prod-session";
    mockedSiteMember.mockResolvedValue(null);

    const role = await resolveActorSiteRole("site-1", sessionContext("prod-session"));

    expect(role).toBe("editor");
  });
});

describe("resolveGlobalActorRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    mockedUser.mockResolvedValue({ id: "user-1" } as never);
    mockedSiteMembers.mockResolvedValue([{ role: "editor" }, { role: "admin" }] as never);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("管理 API キー認証は owner 相当", async () => {
    const role = await resolveGlobalActorRole({
      mode: "admin",
      siteId: "*",
      token: "admin-key",
      scope: "write",
      actorId: "admin:*",
    });

    expect(role).toBe("owner");
    expect(mockedSiteMembers).not.toHaveBeenCalled();
  });

  it("開発用デモセッションは owner 相当", async () => {
    const role = await resolveGlobalActorRole(sessionContext());

    expect(role).toBe("owner");
    expect(mockedSiteMembers).not.toHaveBeenCalled();
  });

  it("本番セッションは全サイトメンバーから最高ロールを採用", async () => {
    process.env.NODE_ENV = "production";
    process.env.CMS_SESSION_TOKEN = "prod-session";

    const role = await resolveGlobalActorRole(sessionContext("prod-session"));

    expect(role).toBe("admin");
    expect(mockedSiteMembers).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { role: true },
    });
  });

  it("メンバー未登録時は editor にフォールバック", async () => {
    process.env.NODE_ENV = "production";
    process.env.CMS_SESSION_TOKEN = "prod-session";
    mockedSiteMembers.mockResolvedValue([]);

    const role = await resolveGlobalActorRole(sessionContext("prod-session"));

    expect(role).toBe("editor");
  });
});
