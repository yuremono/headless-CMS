import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  getAdminMembers: vi.fn(),
  inviteAdminMember: vi.fn(),
  MEMBER_MANAGE_PERMISSION: { permission: "member:manage" },
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn(),
}));

import { getAdminMembers, inviteAdminMember, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedGetMembers = vi.mocked(getAdminMembers);
const mockedInvite = vi.mocked(inviteAdminMember);

const authOk = {
  ok: true as const,
  context: { mode: "admin" as const, siteId: "site-1", token: "k", scope: "write" as const, actorId: "admin:site-1" },
};

describe("GET /api/admin/sites/[siteId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("サイト未存在は 404", async () => {
    mockedGetMembers.mockResolvedValue(null);

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/members"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockedResolve).toHaveBeenCalledWith(
      expect.any(Request),
      "site-1",
      { permission: "member:manage" },
    );
  });

  it("メンバー一覧を返す", async () => {
    mockedGetMembers.mockResolvedValue({ items: [], total: 0 });

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/members"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
  });
});

describe("POST /api/admin/sites/[siteId]/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("JSON 無効は 400", async () => {
    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/members", { method: "POST" }),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("招待成功時 201", async () => {
    mockedInvite.mockResolvedValue({
      ok: true,
      member: {
        id: "member-2",
        siteId: "site-1",
        userId: "user-2",
        email: "editor@example.com",
        name: null,
        role: "editor",
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
      },
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "editor@example.com", role: "editor" }),
      }),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ email: "editor@example.com", role: "editor" });
  });

  it("重複招待はエラーステータスを返す", async () => {
    mockedInvite.mockResolvedValue({
      ok: false,
      status: 409,
      code: "member_exists",
      error: "This user is already a member of the site.",
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "editor@example.com", role: "editor" }),
      }),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(response.status).toBe(409);
  });
});
