import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StorageValidationError } from "./types";
import { validateMediaUpload } from "./validate";

const originalEnv = { ...process.env };

function minimalPngBuffer(extra = 0): Buffer {
  const buffer = Buffer.alloc(12 + extra);
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;
  return buffer;
}

function minimalJpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0x00]);
}

function minimalSvgBuffer(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8");
}

function minimalMp4Buffer(): Buffer {
  const buffer = Buffer.alloc(12);
  buffer.write("    ftypisom", 0, "ascii");
  return buffer;
}

describe("validateMediaUpload", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.UPLOAD_MAX_BYTES;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("空ファイルは empty_file", () => {
    try {
      validateMediaUpload({
        buffer: Buffer.alloc(0),
        declaredMimeType: "image/png",
        size: 0,
      });
      expect.fail("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(StorageValidationError);
      expect((error as StorageValidationError).code).toBe("empty_file");
    }
  });

  it("サイズ超過は file_too_large", () => {
    process.env.UPLOAD_MAX_BYTES = "3";

    try {
      validateMediaUpload({
        buffer: minimalPngBuffer(),
        declaredMimeType: "image/png",
        size: 10,
      });
      expect.fail("should throw");
    } catch (error) {
      expect((error as StorageValidationError).code).toBe("file_too_large");
    }
  });

  it("署名不一致は invalid_file_content", () => {
    try {
      validateMediaUpload({
        buffer: Buffer.from("not-an-image"),
        declaredMimeType: "image/png",
        size: 12,
      });
      expect.fail("should throw");
    } catch (error) {
      expect((error as StorageValidationError).code).toBe("invalid_file_content");
    }
  });

  it("宣言 MIME と検出 MIME が違っても検出結果を優先する", () => {
    const buffer = minimalPngBuffer();
    const result = validateMediaUpload({
      buffer,
      declaredMimeType: "image/jpeg",
      size: buffer.length,
    });

    expect(result.mimeType).toBe("image/png");
  });

  it("type 未設定でも拡張子と内容から判定する", () => {
    const buffer = minimalPngBuffer();
    const result = validateMediaUpload({
      buffer,
      declaredMimeType: "application/octet-stream",
      size: buffer.length,
      filename: "photo.png",
    });

    expect(result.mimeType).toBe("image/png");
  });

  it("有効な PNG を受理する", () => {
    const buffer = minimalPngBuffer();
    const result = validateMediaUpload({
      buffer,
      declaredMimeType: "image/png",
      size: buffer.length,
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.buffer).toBe(buffer);
  });

  it("有効な JPEG を受理する", () => {
    const buffer = minimalJpegBuffer();
    const result = validateMediaUpload({
      buffer,
      declaredMimeType: "image/jpeg",
      size: buffer.length,
    });

    expect(result.mimeType).toBe("image/jpeg");
  });

  it("有効な SVG を受理する", () => {
    const buffer = minimalSvgBuffer();
    const result = validateMediaUpload({
      buffer,
      declaredMimeType: "image/svg+xml",
      size: buffer.length,
    });

    expect(result.mimeType).toBe("image/svg+xml");
  });

  it("有効な MP4 を受理する", () => {
    const buffer = minimalMp4Buffer();
    const result = validateMediaUpload({
      buffer,
      declaredMimeType: "video/mp4",
      size: buffer.length,
    });

    expect(result.mimeType).toBe("video/mp4");
  });
});
