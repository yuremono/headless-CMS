import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  publishAdminContent: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn(),
}));

import { publishAdminContent, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedPublish = vi.mocked(publishAdminContent);

describe("POST /api/admin/.../publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
  });

  it("公開成功時 published ステータス", async () => {
    mockedPublish.mockResolvedValue({
      id: "content-1",
      siteId: "site-1",
      contentType: "news",
      slug: "hello",
      title: "Hello",
      status: "published",
      dataJson: {},
      createdBy: null,
      updatedBy: "admin:site-1",
      publishedAt: "2026-05-29T00:00:00.000Z",
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/content/news/content-1/publish", {
        method: "POST",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "content-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "published" });
    expect(mockedPublish).toHaveBeenCalledWith("site-1", "news", "content-1", "admin:site-1");
  });

  it("対象なし 404", async () => {
    mockedPublish.mockResolvedValue(null);

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/content/news/missing/publish", {
        method: "POST",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
