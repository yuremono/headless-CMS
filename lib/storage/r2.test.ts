import { describe, expect, it } from "vitest";
import { R2StorageProvider } from "./r2";

describe("R2StorageProvider", () => {
  it("未設定時は設定エラーを投げる", async () => {
    const provider = new R2StorageProvider();

    await expect(
      provider.upload({
        siteId: "site-1",
        buffer: Buffer.from("x"),
        originalFilename: "x.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("R2 storage is not configured");
  });
});
