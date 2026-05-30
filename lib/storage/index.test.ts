import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

const originalEnv = { ...process.env };

describe("getStorageProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
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
    ).rejects.toThrow("R2 storage is not configured");
  });

  it("STORAGE_PROVIDER=blob では BlobStorageProvider", async () => {
    process.env.STORAGE_PROVIDER = "blob";
    const { getStorageProvider } = await import("./index");

    const provider = getStorageProvider();

    await expect(
      provider.upload({
        siteId: "site-1",
        buffer: Buffer.from("x"),
        originalFilename: "x.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("Vercel Blob storage is not configured");
  });
});
