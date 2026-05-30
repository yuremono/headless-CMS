import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

vi.mock("@/lib/db/assets", () => ({
  createAsset: vi.fn(),
}));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getStorageProvider: vi.fn(),
    validateImageUpload: vi.fn(),
  };
});

import { createAsset } from "@/lib/db/assets";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { getStorageProvider, validateImageUpload } from "@/lib/storage";
import { StorageValidationError } from "@/lib/storage/types";
import { mapUploadError, uploadSiteAsset } from "./upload-asset";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedValidate = vi.mocked(validateImageUpload);
const mockedGetProvider = vi.mocked(getStorageProvider);
const mockedCreateAsset = vi.mocked(createAsset);

function makeFile(name: string, type: string, bytes: number[]): File {
  const blob = new Blob([Uint8Array.from(bytes)], { type });
  return new File([blob], name, { type });
}

describe("uploadSiteAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedValidate.mockReturnValue({
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      mimeType: "image/png",
      size: 8,
    });
    mockedGetProvider.mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        url: "/uploads/site-1/file.png",
        filename: "file.png",
        mimeType: "image/png",
        size: 8,
        width: null,
        height: null,
      }),
    });
    mockedCreateAsset.mockResolvedValue({
      id: "asset-1",
      siteId: "site-1",
      url: "/uploads/site-1/file.png",
      filename: "file.png",
      mimeType: "image/png",
      size: 8,
      width: null,
      height: null,
      alt: "Alt text",
      createdBy: "user-1",
      createdAt: "2026-05-29T00:00:00.000Z",
    });
  });

  it("サイトが無い場合は site_not_found", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    await expect(
      uploadSiteAsset({
        siteIdOrSlug: "missing",
        file: makeFile("a.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        actorId: "user-1",
      }),
    ).rejects.toMatchObject({ code: "site_not_found" });
  });

  it("正常時は createAsset 結果を返す", async () => {
    const result = await uploadSiteAsset({
      siteIdOrSlug: "main-site",
      file: makeFile("a.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      alt: "  Alt text  ",
      actorId: "user-1",
    });

    expect(result.id).toBe("asset-1");
    expect(mockedCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        alt: "Alt text",
        createdBy: "user-1",
      }),
    );
  });

  it("actorId にコロンがある場合は createdBy null", async () => {
    await uploadSiteAsset({
      siteIdOrSlug: "main-site",
      file: makeFile("a.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      actorId: "admin:site-1",
    });

    expect(mockedCreateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: null }),
    );
  });
});

describe("mapUploadError", () => {
  it("StorageValidationError を HTTP 形式に変換する", () => {
    expect(
      mapUploadError(new StorageValidationError("invalid_mime_type", "bad mime")),
    ).toEqual({
      status: 400,
      code: "invalid_mime_type",
      error: "bad mime",
    });
  });

  it("site_not_found は 404", () => {
    expect(
      mapUploadError(new StorageValidationError("site_not_found", "Site was not found.")),
    ).toMatchObject({ status: 404 });
  });

  it("R2 未設定は 501", () => {
    expect(
      mapUploadError(new Error("R2 storage is not configured.")),
    ).toMatchObject({ status: 501, code: "storage_not_configured" });
  });

  it("Vercel local は 501", () => {
    expect(
      mapUploadError(new Error("Local storage cannot persist uploads on Vercel.")),
    ).toMatchObject({ status: 501, code: "storage_not_configured" });
  });

  it("その他は 500 upload_failed", () => {
    expect(mapUploadError(new Error("boom"))).toEqual({
      status: 500,
      code: "upload_failed",
      error: "Failed to upload asset.",
    });
  });
});
