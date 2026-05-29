import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  extensionForMimeType,
  getMaxUploadBytes,
  getStorageProviderName,
  isAllowedImageMimeType,
  sanitizeFilename,
} from "./config";

const originalEnv = { ...process.env };

describe("getMaxUploadBytes", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("未設定時は既定 5MB", () => {
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
    expect(getStorageProviderName()).toBe("local");
  });

  it("r2 を指定できる", () => {
    process.env.STORAGE_PROVIDER = "R2";
    expect(getStorageProviderName()).toBe("r2");
  });
});

describe("isAllowedImageMimeType", () => {
  it("許可 MIME のみ true", () => {
    expect(isAllowedImageMimeType("image/png")).toBe(true);
    expect(isAllowedImageMimeType("text/plain")).toBe(false);
  });
});

describe("extensionForMimeType", () => {
  it("MIME ごとの拡張子を返す", () => {
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
    expect(extensionForMimeType("image/webp")).toBe(".webp");
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
