import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  getSchemas: vi.fn(),
}));

import { getSchemas, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedGetSchemas = vi.mocked(getSchemas);

describe("GET /api/admin/sites/[siteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("認証失敗時はエラー", async () => {
    mockedResolve.mockResolvedValue({
      ok: false,
      failure: { status: 401, code: "missing_session", error: "Session is required." },
    });

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("siteId と schemas を返す", async () => {
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
    mockedGetSchemas.mockResolvedValue([
      {
        id: "model-1",
        siteId: "site-1",
        name: "News",
        apiName: "news",
        type: "collection",
        schemaJson: {},
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
      },
    ]);

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      siteId: "site-1",
      schemas: [expect.objectContaining({ apiName: "news" })],
    });
  });
});
