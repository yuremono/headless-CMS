import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/content/service", () => ({
  resolveAdminRequest: vi.fn(),
  getAdminAssets: vi.fn(),
}));

vi.mock("@/lib/storage/upload-asset", () => ({
  uploadSiteAsset: vi.fn(),
  mapUploadError: vi.fn(),
}));

import { getAdminAssets, resolveAdminRequest } from "@/lib/content/service";
import { mapUploadError, uploadSiteAsset } from "@/lib/storage/upload-asset";

const mockedResolve = vi.mocked(resolveAdminRequest);
const mockedGetAssets = vi.mocked(getAdminAssets);
const mockedUpload = vi.mocked(uploadSiteAsset);
const mockedMapError = vi.mocked(mapUploadError);

describe("GET /api/admin/sites/[siteId]/assets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
  });

  it("サイト未存在は 404", async () => {
    mockedGetAssets.mockResolvedValue(null);

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/assets"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("アセット一覧を返す", async () => {
    mockedGetAssets.mockResolvedValue({ items: [], total: 0 });

    const response = await GET(new Request("https://example.com/api/admin/sites/site-1/assets"), {
      params: Promise.resolve({ siteId: "site-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
  });
});

describe("POST /api/admin/sites/[siteId]/assets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolve.mockResolvedValue({
      ok: true,
      context: { mode: "admin", siteId: "site-1", token: "k", scope: "write", actorId: "admin:site-1" },
    });
  });

  it("file フィールド無しは 400", async () => {
    const form = new FormData();
    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/assets", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "missing_file",
      error: "Multipart field `file` is required.",
    });
  });

  it("アップロード成功時 201", async () => {
    mockedUpload.mockResolvedValue({
      id: "asset-1",
      siteId: "site-1",
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      url: "/uploads/photo.jpg",
      alt: "alt text",
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const form = new FormData();
    form.set("file", new File(["data"], "photo.jpg", { type: "image/jpeg" }));
    form.set("alt", "alt text");

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/assets", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: "asset-1" });
  });

  it("アップロードエラーをマッピング", async () => {
    mockedUpload.mockRejectedValue(new Error("too large"));
    mockedMapError.mockReturnValue({ status: 413, code: "file_too_large", error: "File too large." });

    const form = new FormData();
    form.set("file", new File(["data"], "big.jpg", { type: "image/jpeg" }));

    const response = await POST(
      new Request("https://example.com/api/admin/sites/site-1/assets", {
        method: "POST",
        body: form,
      }),
      { params: Promise.resolve({ siteId: "site-1" }) },
    );

    expect(response.status).toBe(413);
  });
});
