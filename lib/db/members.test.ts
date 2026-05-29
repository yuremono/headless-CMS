import type { SiteMember, User } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    siteMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./prisma";
import { resolveSiteId } from "./site-resolver";
import {
  inviteSiteMember,
  listSiteMembers,
  mapSiteMemberRecord,
  removeSiteMember,
  updateSiteMemberRole,
} from "./members";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedFindMany = vi.mocked(prisma.siteMember.findMany);
const mockedFindFirst = vi.mocked(prisma.siteMember.findFirst);
const mockedCount = vi.mocked(prisma.siteMember.count);
const mockedUpdate = vi.mocked(prisma.siteMember.update);
const mockedDelete = vi.mocked(prisma.siteMember.delete);
const mockedTransaction = vi.mocked(prisma.$transaction);

const now = new Date("2026-05-29T00:00:00.000Z");

function makeMember(overrides: Partial<SiteMember> = {}): SiteMember & { user: User } {
  return {
    id: "member-1",
    siteId: "site-1",
    userId: "user-1",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    user: {
      id: "user-1",
      name: "Admin User",
      email: "admin@example.com",
      emailVerified: null,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    ...overrides,
  };
}

describe("mapSiteMemberRecord", () => {
  it("SiteMember を API 用オブジェクトに変換する", () => {
    expect(mapSiteMemberRecord(makeMember())).toEqual({
      id: "member-1",
      siteId: "site-1",
      userId: "user-1",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });
});

describe("listSiteMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("サイト未存在は null", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    await expect(listSiteMembers("missing")).resolves.toBeNull();
  });

  it("メンバー一覧を返す", async () => {
    mockedFindMany.mockResolvedValue([makeMember()] as never);

    await expect(listSiteMembers("site-1")).resolves.toEqual({
      items: [
        {
          id: "member-1",
          siteId: "site-1",
          userId: "user-1",
          email: "admin@example.com",
          name: "Admin User",
          role: "admin",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ],
      total: 1,
    });
  });
});

describe("inviteSiteMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("無効なメールは 400", async () => {
    const result = await inviteSiteMember("site-1", { email: "bad", role: "editor" });

    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "invalid_email",
      error: "A valid email address is required.",
    });
  });

  it("既存メンバーは 409", async () => {
    mockedFindFirst.mockResolvedValue({ id: "member-1" } as never);

    const result = await inviteSiteMember("site-1", {
      email: "editor@example.com",
      role: "editor",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.code).toBe("member_exists");
    }
  });

  it("招待成功時メンバーを返す", async () => {
    mockedFindFirst.mockResolvedValue(null);
    mockedTransaction.mockImplementation(async (callback) =>
      callback({
        user: {
          upsert: vi.fn().mockResolvedValue({ id: "user-2", email: "editor@example.com" }),
        },
        siteMember: {
          create: vi.fn().mockResolvedValue(
            makeMember({
              id: "member-2",
              role: "editor",
              user: {
                id: "user-2",
                name: null,
                email: "editor@example.com",
                emailVerified: null,
                image: null,
                createdAt: now,
                updatedAt: now,
              },
            }),
          ),
        },
      }),
    );

    const result = await inviteSiteMember("site-1", {
      email: "editor@example.com",
      role: "editor",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.member.email).toBe("editor@example.com");
      expect(result.member.role).toBe("editor");
    }
  });
});

describe("updateSiteMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("最後の owner のロール変更は 409", async () => {
    mockedFindFirst.mockResolvedValue(makeMember({ role: "owner" }) as never);
    mockedCount.mockResolvedValue(1);

    const result = await updateSiteMemberRole("site-1", "member-1", { role: "admin" });

    expect(result).toEqual({
      ok: false,
      status: 409,
      code: "last_owner",
      error: "Cannot change the role of the last owner.",
    });
  });

  it("ロール更新成功", async () => {
    mockedFindFirst.mockResolvedValue(makeMember({ role: "editor" }) as never);
    mockedUpdate.mockResolvedValue(makeMember({ role: "viewer" }) as never);

    const result = await updateSiteMemberRole("site-1", "member-1", { role: "viewer" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.member.role).toBe("viewer");
    }
  });
});

describe("removeSiteMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("最後の owner 削除は 409", async () => {
    mockedFindFirst.mockResolvedValue({ id: "member-1", role: "owner" } as never);
    mockedCount.mockResolvedValue(1);

    const result = await removeSiteMember("site-1", "member-1");

    expect(result).toEqual({
      ok: false,
      status: 409,
      code: "last_owner",
      error: "Cannot remove the last owner from the site.",
    });
  });

  it("削除成功", async () => {
    mockedFindFirst.mockResolvedValue({ id: "member-1", role: "editor" } as never);
    mockedDelete.mockResolvedValue(makeMember() as never);

    await expect(removeSiteMember("site-1", "member-1")).resolves.toEqual({ ok: true });
  });
});
