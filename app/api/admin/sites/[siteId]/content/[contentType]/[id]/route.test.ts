import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  getAdminContentRecord: vi.fn(),
  getDeliveryContent: vi.fn(),
  updateAdminContent: vi.fn(),
  removeAdminContent: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  recordAuditFromContext: vi.fn(),
}));

import {
  getAdminContentRecord,
  getDeliveryContent,
  removeAdminContent,
  resolveAdminRequest,
  updateAdminContent,
} from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedGetAdmin = vi.mocked(getAdminContentRecord);
const mockedGetDelivery = vi.mocked(getDeliveryContent);
const mockedUpdate = vi.mocked(updateAdminContent);
const mockedRemove = vi.mocked(removeAdminContent);

const authOk = {
  ok: true as const,
  context: { mode: "admin" as const, siteId: "site-1", token: "k", scope: "write" as const, actorId: "admin:site-1" },
};

const params = Promise.resolve({ siteId: "site-1", contentType: "news", id: "content-1" });

describe("GET /api/admin/.../content/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("format=api は配信用レコード", async () => {
    mockedGetDelivery.mockResolvedValue({
      id: "content-1",
      siteId: "site-1",
      contentType: "news",
      slug: "hello",
      title: "Hello",
      status: "draft",
      dataJson: {},
      createdBy: null,
      updatedBy: null,
      publishedAt: null,
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const response = await GET(
      new Request("https://example.com/api/admin/sites/site-1/content/news/content-1?format=api"),
      { params },
    );

    expect(response.status).toBe(200);
    expect(mockedGetDelivery).toHaveBeenCalledWith("site-1", "news", "content-1", true);
  });

  it("存在しないコンテンツは 404", async () => {
    mockedGetAdmin.mockResolvedValue(null);

    const response = await GET(
      new Request("https://example.com/api/admin/sites/site-1/content/news/missing"),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/.../content/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("更新成功時 JSON を返す", async () => {
    mockedUpdate.mockResolvedValue({
      id: "content-1",
      siteId: "site-1",
      contentType: "news",
      slug: "hello",
      title: "Updated",
      status: "draft",
      dataJson: {},
      createdBy: null,
      updatedBy: "admin:site-1",
      publishedAt: null,
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T01:00:00.000Z",
    });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/content/news/content-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ title: "Updated" });
  });
});

describe("DELETE /api/admin/.../content/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue(authOk);
  });

  it("削除成功時 204", async () => {
    mockedRemove.mockResolvedValue(true);

    const response = await DELETE(
      new Request("https://example.com/api/admin/sites/site-1/content/news/content-1", {
        method: "DELETE",
      }),
      { params },
    );

    expect(response.status).toBe(204);
  });

  it("削除失敗時 404", async () => {
    mockedRemove.mockResolvedValue(false);

    const response = await DELETE(
      new Request("https://example.com/api/admin/sites/site-1/content/news/missing", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ siteId: "site-1", contentType: "news", id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
