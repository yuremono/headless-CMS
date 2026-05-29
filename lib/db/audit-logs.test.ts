import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";
import { resolveSiteId } from "./site-resolver";
import { listAuditLogs } from "./audit-logs";

const mockedResolveSiteId = vi.mocked(resolveSiteId);
const mockedFindMany = vi.mocked(prisma.auditLog.findMany);
const mockedCount = vi.mocked(prisma.auditLog.count);

const now = new Date("2026-05-29T00:00:00.000Z");

describe("listAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-1");
  });

  it("サイト未存在時 null", async () => {
    mockedResolveSiteId.mockResolvedValue(null);

    await expect(listAuditLogs("missing")).resolves.toBeNull();
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("監査ログ一覧を返す", async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: "log-1",
        siteId: "site-1",
        userId: null,
        action: "content.create",
        resource: "content",
        resourceId: "content-1",
        metadata: { contentType: "news" },
        createdAt: now,
      },
    ]);
    mockedCount.mockResolvedValue(1);

    const result = await listAuditLogs("demo", { limit: 10, offset: 0 });

    expect(result).toEqual({
      items: [
        {
          id: "log-1",
          siteId: "site-1",
          userId: null,
          action: "content.create",
          resource: "content",
          resourceId: "content-1",
          metadata: { contentType: "news" },
          createdAt: now.toISOString(),
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { siteId: "site-1" },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 0,
    });
  });
});
