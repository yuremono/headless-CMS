import { mkdir, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

import { LocalStorageProvider } from "./local";

const mockedMkdir = vi.mocked(mkdir);
const mockedWriteFile = vi.mocked(writeFile);

describe("LocalStorageProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedMkdir.mockResolvedValue(undefined);
    mockedWriteFile.mockResolvedValue(undefined);
  });

  it("ファイルを public/uploads に保存する", async () => {
    const provider = new LocalStorageProvider();
    const buffer = Buffer.from("fake-image");

    const stored = await provider.upload({
      siteId: "site-1",
      buffer,
      originalFilename: "hero banner.png",
      mimeType: "image/png",
    });

    expect(stored.url).toMatch(/^\/uploads\/site-1\//);
    expect(stored.filename).toMatch(/\.png$/);
    expect(stored.mimeType).toBe("image/png");
    expect(stored.size).toBe(buffer.length);
    expect(mockedMkdir).toHaveBeenCalled();
    expect(mockedWriteFile).toHaveBeenCalled();
  });
});
