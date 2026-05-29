import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  duplicateAdminContent: vi.fn(),
}));

import { duplicateAdminContent, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedDuplicate = vi.mocked(duplicateAdminContent);

describe("POST /api/admin/.../duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
  });

  it("複製成功時 201", async () => {
    mockedDuplicate.mockResolvedValue({
      id: "content-copy",
      siteId: "site-1",
      contentType: "news",
      slug: "hello-copy-xyz",
      title: "Hello (コピー)",
      status: "draft",
      dataJson: {},
      createdBy: "admin:site-1",
      updatedBy: "admin:site-1",
      publishedAt: null,
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/content/news/content-1/duplicate", {
        method: "POST",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "content-1" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: "content-copy",
      status: "draft",
    });
    expect(mockedDuplicate).toHaveBeenCalledWith("site-1", "news", "content-1", "admin:site-1");
  });

  it("元が無い場合 404", async () => {
    mockedDuplicate.mockResolvedValue(null);

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/content/news/missing/duplicate", {
        method: "POST",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
