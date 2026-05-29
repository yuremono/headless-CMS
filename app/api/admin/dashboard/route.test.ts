import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveGlobalAdminRequest: vi.fn(),
}));

vi.mock("@/lib/db/sites", () => ({
  getDashboardSnapshot: vi.fn(),
}));

import { resolveGlobalAdminRequest } from "@/lib/content/service";
import { getDashboardSnapshot } from "@/lib/db/sites";

const mockedResolve = vi.mocked(resolveGlobalAdminRequest);
const mockedSnapshot = vi.mocked(getDashboardSnapshot);

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証失敗時は 403", async () => {
    mockedResolve.mockResolvedValue({
      ok: false,
      failure: { status: 403, code: "invalid_api_key", error: "API key is invalid." },
    });

    const response = await GET(new Request("https://example.com/api/admin/dashboard"));

    expect(response.status).toBe(403);
    expect(mockedSnapshot).not.toHaveBeenCalled();
  });

  it("認証成功時はダッシュボードスナップショット", async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "session", siteId: "*", token: "s", scope: "write", actorId: "session:*" },
    });
    mockedSnapshot.mockResolvedValue({
      sites: [],
      recentContents: [],
      contentTypes: [],
    });

    const response = await GET(new Request("https://example.com/api/admin/dashboard"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sites: [],
      recentContents: [],
      contentTypes: [],
    });
  });
});
