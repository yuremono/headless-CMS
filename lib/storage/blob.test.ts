import { describe, expect, it } from "vitest";
import { BlobStorageProvider } from "./blob";

describe("BlobStorageProvider", () => {
  it("未設定時は設定エラーを投げる", async () => {
    const original = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const provider = new BlobStorageProvider();

    await expect(
      provider.upload({
        siteId: "site-1",
        buffer: Buffer.from("x"),
        originalFilename: "x.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("Vercel Blob storage is not configured");

    if (original) {
      process.env.BLOB_READ_WRITE_TOKEN = original;
    }
  });
});
