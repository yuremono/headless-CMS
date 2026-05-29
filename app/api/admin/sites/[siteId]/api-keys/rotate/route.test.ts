import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
}));

vi.mock("@/lib/db/api-keys", () => ({
  rotateSiteApiKeys: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn(),
}));

import { resolveAdminRequest } from "@/lib/content/service";
import { rotateSiteApiKeys } from "@/lib/db/api-keys";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedRotate = vi.mocked(rotateSiteApiKeys);

describe("POST /api/admin/sites/[siteId]/api-keys/rotate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証失敗時はエラー", async () => {
    mockedResolve.mockResolvedValue({
      ok: false,
      failure: { status: 401, code: "missing_session", error: "Session is required." },
    });

    const response = await POST(new Request("https://example.com/api/admin/sites/site-1/api-keys/rotate", { method: "POST" }), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(401);
    expect(mockedRotate).not.toHaveBeenCalled();
  });

  it("api_key:manage 権限で認証する", async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
    mockedRotate.mockResolvedValue({
      ok: true,
      apiKeys: { public: "public_new", admin: "admin_new" },
    });

    const response = await POST(new Request("https://example.com/api/admin/sites/site-1/api-keys/rotate", { method: "POST" }), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(mockedResolve).toHaveBeenCalledWith(expect.any(Request), "site-1", {
      permission: "api_key:manage",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      apiKeys: { public: "public_new", admin: "admin_new" },
    });
  });

  it("サイト未存在は 404", async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "missing", token: "k", scope: "write", actorId: "admin:missing" },
    });
    mockedRotate.mockResolvedValue({
      ok: false,
      status: 404,
      code: "site_not_found",
      error: "Site was not found.",
    });

    const response = await POST(new Request("https://example.com/api/admin/sites/missing/api-keys/rotate", { method: "POST" }), {
      params: Promise.resolve({ siteId: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
