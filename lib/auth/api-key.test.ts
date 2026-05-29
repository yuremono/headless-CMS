import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    apiKey: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { validateStoredAdminApiKeyGlobal, validateStoredApiKey } from "./api-key";

const mockedFindFirst = vi.mocked(prisma.apiKey.findFirst);
const mockedUpdate = vi.mocked(prisma.apiKey.update);
const mockedResolveSiteId = vi.mocked(resolveSiteId);

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

describe("validateStoredApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
    mockedUpdate.mockResolvedValue({} as never);
  });

  it("有効な API キーで true を返す", async () => {
    mockedFindFirst.mockResolvedValue({ id: "key-1" } as never);

    const result = await validateStoredApiKey("main-site", "secret-token", "public");

    expect(result).toBe(true);
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: {
        siteId: "site-1",
        kind: "public",
        keyHash: hashSecret("secret-token"),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      },
    });
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("サイトが解決できない場合は false", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    expect(await validateStoredApiKey("unknown", "token", "admin")).toBe(false);
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("DB に一致するキーがない場合は false", async () => {
    mockedFindFirst.mockResolvedValue(null);

    expect(await validateStoredApiKey("site-1", "wrong-token", "admin")).toBe(false);
  });

  it("DB エラー時は false を返す", async () => {
    mockedFindFirst.mockRejectedValue(new Error("connection failed"));

    expect(await validateStoredApiKey("site-1", "token", "public")).toBe(false);
  });
});

describe("validateStoredAdminApiKeyGlobal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("グローバル管理キーが DB に存在すれば true", async () => {
    mockedFindFirst.mockResolvedValue({ id: "admin-key-1" } as never);

    expect(await validateStoredAdminApiKeyGlobal("admin-secret")).toBe(true);
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: {
        kind: "admin",
        keyHash: hashSecret("admin-secret"),
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      },
    });
  });

  it("一致するキーがなければ false", async () => {
    mockedFindFirst.mockResolvedValue(null);

    expect(await validateStoredAdminApiKeyGlobal("invalid")).toBe(false);
  });

  it("DB エラー時は false", async () => {
    mockedFindFirst.mockRejectedValue(new Error("timeout"));

    expect(await validateStoredAdminApiKeyGlobal("token")).toBe(false);
  });
});
