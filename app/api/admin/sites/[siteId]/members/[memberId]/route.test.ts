import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  patchAdminMember: vi.fn(),
  deleteAdminMember: vi.fn(),
  MEMBER_MANAGE_PERMISSION: { permission: "member:manage" },
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn(),
}));

import { deleteAdminMember, patchAdminMember, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedPatch = vi.mocked(patchAdminMember);
const mockedDelete = vi.mocked(deleteAdminMember);

const authOk = {
  ok: true as const,
  context: { mode: "admin" as const, siteId: "site-1", token: "k", scope: "write" as const, actorId: "admin:site-1" },
};

describe("PATCH /api/admin/sites/[siteId]/members/[memberId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("ロール更新成功", async () => {
    mockedPatch.mockResolvedValue({
      ok: true,
      member: {
        id: "member-1",
        siteId: "site-1",
        userId: "user-1",
        email: "admin@example.com",
        name: "Admin",
        role: "viewer",
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
      },
    });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/members/member-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "viewer" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", memberId: "member-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ role: "viewer" });
  });

  it("メンバー未存在は 404", async () => {
    mockedPatch.mockResolvedValue({
      ok: false,
      status: 404,
      code: "member_not_found",
      error: "Site member was not found.",
    });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/members/missing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "viewer" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", memberId: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/admin/sites/[siteId]/members/[memberId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("削除成功時 204", async () => {
    mockedDelete.mockResolvedValue({ ok: true });

    const response = await DELETE(
      new Request("https://example.com/api/admin/sites/site-1/members/member-1", { method: "DELETE" }),
      { params: Promise.resolve({ siteId: "site-1", memberId: "member-1" }) },
    );

    expect(response.status).toBe(204);
  });

  it("最後の owner 削除は 409", async () => {
    mockedDelete.mockResolvedValue({
      ok: false,
      status: 409,
      code: "last_owner",
      error: "Cannot remove the last owner from the site.",
    });

    const response = await DELETE(
      new Request("https://example.com/api/admin/sites/site-1/members/member-1", { method: "DELETE" }),
      { params: Promise.resolve({ siteId: "site-1", memberId: "member-1" }) },
    );

    expect(response.status).toBe(409);
  });
});
