import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("./site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

import { prisma } from "./prisma";
import { resolveSiteId } from "./site-resolver";
import { createApiKeySecret, hashApiKeySecret, rotateSiteApiKeys } from "./api-keys";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedTransaction = vi.mocked(prisma.$transaction);

describe("createApiKeySecret", () => {
  it("prefix と hash を生成する", () => {
    const key = createApiKeySecret("public");

    expect(key.secret).toMatch(/^public_/);
    expect(key.prefix).toHaveLength(12);
    expect(key.keyHash).toBe(hashApiKeySecret(key.secret));
  });
});

describe("rotateSiteApiKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("サイト未存在は 404", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    const result = await rotateSiteApiKeys("unknown");

    expect(result).toEqual({
      ok: false,
      status: 404,
      code: "site_not_found",
      error: "Site was not found.",
    });
  });

  it("既存キーを失効し新キーを返す", async () => {
    mockedResolveSiteId.mockResolvedValue("site-1");

    const tx = {
      apiKey: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    mockedTransaction.mockImplementation(async (callback) => callback(tx as never));

    const result = await rotateSiteApiKeys("main-site");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.apiKeys.public).toMatch(/^public_/);
      expect(result.apiKeys.admin).toMatch(/^admin_/);
    }

    expect(tx.apiKey.updateMany).toHaveBeenCalledWith({
      where: { siteId: "site-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.apiKey.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ siteId: "site-1", kind: "public" }),
        expect.objectContaining({ siteId: "site-1", kind: "admin" }),
      ],
    });
  });
});
