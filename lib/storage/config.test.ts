import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  extensionForMimeType,
  getMaxUploadBytes,
  getStorageProviderName,
  isAllowedImageMimeType,
  isAllowedMediaMimeType,
  isAllowedVideoMimeType,
  sanitizeFilename,
} from "./config";

const originalEnv = { ...process.env };

describe("getMaxUploadBytes", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("未設定時は既定 4.5MB", () => {
    delete process.env.UPLOAD_MAX_BYTES;
    expect(getMaxUploadBytes()).toBe(DEFAULT_MAX_UPLOAD_BYTES);
  });

  it("環境変数で上書きできる", () => {
    process.env.UPLOAD_MAX_BYTES = "1048576";
    expect(getMaxUploadBytes()).toBe(1048576);
  });
});

describe("getStorageProviderName", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("未設定時は local", () => {
    delete process.env.STORAGE_PROVIDER;
    delete process.env.VERCEL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(getStorageProviderName()).toBe("local");
  });

  it("r2 を指定できる", () => {
    process.env.STORAGE_PROVIDER = "R2";
    expect(getStorageProviderName()).toBe("r2");
  });

  it("blob を指定できる", () => {
    process.env.STORAGE_PROVIDER = "blob";
    expect(getStorageProviderName()).toBe("blob");
  });

  it("Vercel で Blob トークンがある場合は blob を自動選択", () => {
    delete process.env.STORAGE_PROVIDER;
    process.env.VERCEL = "1";
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    expect(getStorageProviderName()).toBe("blob");
  });
});

describe("isAllowedMediaMimeType", () => {
  it("画像・動画 MIME を許可する", () => {
    expect(isAllowedImageMimeType("image/png")).toBe(true);
    expect(isAllowedVideoMimeType("video/mp4")).toBe(true);
    expect(isAllowedMediaMimeType("text/plain")).toBe(false);
  });
});

describe("extensionForMimeType", () => {
  it("MIME ごとの拡張子を返す", () => {
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
    expect(extensionForMimeType("video/mp4")).toBe(".mp4");
    expect(extensionForMimeType("image/svg+xml")).toBe(".svg");
  });
});

describe("sanitizeFilename", () => {
  it("パス区切りと危険文字を除去する", () => {
    expect(sanitizeFilename("../../evil name!!.png")).toBe("evil-name-.png");
  });

  it("空になる場合は upload", () => {
    expect(sanitizeFilename("///")).toBe("upload");
  });
});
