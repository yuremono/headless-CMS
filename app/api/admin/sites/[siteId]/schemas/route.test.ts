import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  getSchemas: vi.fn(),
}));

import { getSchemas, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedGetSchemas = vi.mocked(getSchemas);

describe("GET /api/admin/sites/[siteId]/schemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
  });

  it("スキーマ配列をそのまま返す", async () => {
    mockedGetSchemas.mockResolvedValue([]);

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/schemas"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(mockedGetSchemas).toHaveBeenCalledWith("site-1");
  });
});
