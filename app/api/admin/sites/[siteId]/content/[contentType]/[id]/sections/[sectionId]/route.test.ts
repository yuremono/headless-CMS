import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  patchAdminSection: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn(),
}));

import { patchAdminSection, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedPatch = vi.mocked(patchAdminSection);

const authOk = {
  ok: true as const,
  context: { mode: "admin" as const, siteId: "site-1", token: "k", scope: "write" as const, actorId: "admin:site-1" },
};

const params = Promise.resolve({
  siteId: "site-1",
  contentType: "page",
  id: "content-1",
  sectionId: "sec_text_001",
});

describe("PATCH /api/admin/.../sections/[sectionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("更新成功時はコンテンツ JSON を返す", async () => {
    mockedPatch.mockResolvedValue({
      ok: true,
      content: {
        id: "content-1",
        siteId: "site-1",
        contentType: "page",
        slug: "about",
        title: "About",
        status: "draft",
        dataJson: {
          sections: [{ type: "textBlock", id: "sec_text_001", data: { title: "Updated" } }],
        },
        createdBy: null,
        updatedBy: "admin:site-1",
        publishedAt: null,
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T01:00:00.000Z",
      },
    });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/content/page/content-1/sections/sec_text_001", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params },
    );

    expect(response.status).toBe(200);
    expect(mockedPatch).toHaveBeenCalledWith(
      "site-1",
      "page",
      "content-1",
      "sec_text_001",
      { title: "Updated" },
      "admin:site-1",
    );
    await expect(response.json()).resolves.toMatchObject({ id: "content-1" });
  });

  it("セクション未存在は 404", async () => {
    mockedPatch.mockResolvedValue({ ok: false, error: "section_not_found", status: 404 });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/content/page/content-1/sections/missing", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "page", id: "content-1", sectionId: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "section_not_found" });
  });

  it("認証失敗時はエラーを返す", async () => {
    mockedResolve.mockResolvedValue({
      ok: false,
      failure: { status: 401, code: "unauthorized", error: "Unauthorized." },
    });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/content/page/content-1/sections/sec_text_001", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params },
    );

    expect(response.status).toBe(401);
  });
});
