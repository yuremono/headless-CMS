import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  patchAdminAsset: vi.fn(),
  removeAdminAsset: vi.fn(),
}));

import { patchAdminAsset, removeAdminAsset, resolveAdminRequest } from "@/lib/content/service";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedPatch = vi.mocked(patchAdminAsset);
const mockedRemove = vi.mocked(removeAdminAsset);

describe("PATCH /api/admin/sites/[siteId]/assets/[assetId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
  });

  it("不正 JSON は 400", async () => {
    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/assets/asset-1", {
        method: "PATCH",
        body: "{",
      }),
      { params: Promise.resolve({ siteId: "site-1", assetId: "asset-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("alt 必須エラー", async () => {
    mockedPatch.mockResolvedValue({ error: "missing_alt" });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/assets/asset-1", {
        method: "PATCH",
        body: JSON.stringify({ alt: "" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", assetId: "asset-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "missing_alt",
      error: "Field `alt` is required.",
    });
  });

  it("更新成功", async () => {
    mockedPatch.mockResolvedValue({
      asset: {
        id: "asset-1",
        siteId: "site-1",
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        url: "/uploads/photo.jpg",
        alt: "new alt",
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T01:00:00.000Z",
      },
    });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/assets/asset-1", {
        method: "PATCH",
        body: JSON.stringify({ alt: "new alt" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", assetId: "asset-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ alt: "new alt" });
  });

  it("アセット未存在 404", async () => {
    mockedPatch.mockResolvedValue({ error: "asset_not_found" });

    const response = await PATCH(
      new Request("https://example.com/api/admin/sites/site-1/assets/missing", {
        method: "PATCH",
        body: JSON.stringify({ alt: "x" }),
      }),
      { params: Promise.resolve({ siteId: "site-1", assetId: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("削除成功", async () => {
    mockedRemove.mockResolvedValue(true);

    const response = await DELETE(
      new Request("https://example.com/api/admin/sites/site-1/assets/asset-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ siteId: "site-1", assetId: "asset-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("削除対象未存在 404", async () => {
    mockedRemove.mockResolvedValue(false);

    const response = await DELETE(
      new Request("https://example.com/api/admin/sites/site-1/assets/missing", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ siteId: "site-1", assetId: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "asset_not_found" });
  });
});
