import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  unpublishAdminContent: vi.fn(),
}));

import { resolveAdminRequest, unpublishAdminContent } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedUnpublish = vi.mocked(unpublishAdminContent);

describe("POST /api/admin/.../unpublish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "session", siteId: "site-1", token: "s", scope: "write", actorId: "session:site-1" },
    });
  });

  it("非公開成功", async () => {
    mockedUnpublish.mockResolvedValue({
      id: "content-1",
      siteId: "site-1",
      contentType: "news",
      slug: "hello",
      title: "Hello",
      status: "unpublished",
      dataJson: {},
      createdBy: null,
      updatedBy: "session:site-1",
      publishedAt: "2026-05-29T00:00:00.000Z",
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/content/news/content-1/unpublish", {
        method: "POST",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "content-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "unpublished" });
  });
});
