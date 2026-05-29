import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

const originalEnv = { ...process.env };

describe("getStorageProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("既定は LocalStorageProvider", async () => {
    delete process.env.STORAGE_PROVIDER;
    const { getStorageProvider } = await import("./index");

    const provider = getStorageProvider();
    await expect(
      provider.upload({
        siteId: "site-1",
        buffer: Buffer.alloc(12),
        originalFilename: "x.png",
        mimeType: "image/png",
      }),
    ).resolves.toBeDefined();
  });

  it("STORAGE_PROVIDER=r2 では R2StorageProvider", async () => {
    process.env.STORAGE_PROVIDER = "r2";
    const { getStorageProvider } = await import("./index");

    const provider = getStorageProvider();

    await expect(
      provider.upload({
        siteId: "site-1",
        buffer: Buffer.from("x"),
        originalFilename: "x.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("R2 storage is not implemented");
  });
});
