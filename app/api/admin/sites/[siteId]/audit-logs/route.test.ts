import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
}));

vi.mock("@/lib/db/audit-logs", () => ({
  listAuditLogs: vi.fn(),
}));

import { resolveAdminRequest } from "@/lib/content/service";
import { listAuditLogs } from "@/lib/db/audit-logs";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedList = vi.mocked(listAuditLogs);

describe("GET /api/admin/sites/[siteId]/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証失敗時はエラー", async () => {
    mockedResolve.mockResolvedValue({
      ok: false,
      failure: { status: 403, code: "forbidden", error: "Insufficient permissions for this action." },
    });

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/audit-logs"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(403);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("audit:read 権限で一覧を返す", async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      context: {
        mode: "admin",
        siteId: "site-1",
        token: "k",
        scope: "write",
        actorId: "admin:site-1",
        siteRole: "owner",
      },
    });
    mockedList.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    const response = await GET(
      new Request("https://example.com/api/admin/sites/site-1/audit-logs?limit=20&offset=0"),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(mockedResolve).toHaveBeenCalledWith(expect.any(Request), "site-1", {
      permission: "audit:read",
    });
    expect(mockedList).toHaveBeenCalledWith("site-1", { limit: 20, offset: 0 });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });

  it("サイト未存在は 404", async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "missing", token: "k", scope: "write", actorId: "admin:missing" },
    });
    mockedList.mockResolvedValue(null);

    const response = await GET(new Request("https://example.com/api/admin/sites/missing/audit-logs"), {
      params: Promise.resolve({ siteId: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
