import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSiteId: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";
import {
  auditMetadataFromContext,
  mapAuditLogRecord,
  recordAuditFromContext,
  recordAuditLog,
} from "./log";

const mockedCreate = vi.mocked(prisma.auditLog.create);
const mockedResolveSiteId = vi.mocked(resolveSiteId);

const now = new Date("2026-05-29T00:00:00.000Z");

describe("mapAuditLogRecord", () => {
  it("Prisma レコードを API 形式に変換する", () => {
    expect(
      mapAuditLogRecord({
        id: "log-1",
        siteId: "site-1",
        userId: "user-1",
        action: "content.create",
        resource: "content",
        resourceId: "content-1",
        metadata: { contentType: "news" },
        createdAt: now,
      }),
    ).toEqual({
      id: "log-1",
      siteId: "site-1",
      userId: "user-1",
      action: "content.create",
      resource: "content",
      resourceId: "content-1",
      metadata: { contentType: "news" },
      createdAt: now.toISOString(),
    });
  });
});

describe("recordAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("監査ログを作成する", async () => {
    mockedCreate.mockResolvedValue({
      id: "log-1",
      siteId: "site-1",
      userId: null,
      action: "content.create",
      resource: "content",
      resourceId: "content-1",
      metadata: { actorId: "admin:site-1" },
      createdAt: now,
    });

    const result = await recordAuditLog({
      siteId: "site-1",
      action: "content.create",
      resource: "content",
      resourceId: "content-1",
      metadata: { actorId: "admin:site-1" },
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        siteId: "site-1",
        userId: null,
        action: "content.create",
        resource: "content",
        resourceId: "content-1",
        metadata: { actorId: "admin:site-1" },
      },
    });
    expect(result.id).toBe("log-1");
  });
});

describe("recordAuditFromContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveSiteId.mockResolvedValue("site-uuid");
    mockedCreate.mockResolvedValue({
      id: "log-1",
      siteId: "site-uuid",
      userId: "user-1",
      action: "content.publish",
      resource: "content",
      resourceId: "content-1",
      metadata: {},
      createdAt: now,
    });
  });

  it("site slug を解決して記録する", async () => {
    await recordAuditFromContext(
      {
        mode: "session",
        siteId: "demo",
        token: "t",
        scope: "write",
        actorId: "session:demo",
        userId: "user-1",
      },
      "demo",
      "content.publish",
      "content",
      "content-1",
      { contentType: "news" },
    );

    expect(mockedResolveSiteId).toHaveBeenCalledWith("demo");
    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        siteId: "site-uuid",
        userId: "user-1",
        action: "content.publish",
        resourceId: "content-1",
        metadata: expect.objectContaining({
          actorId: "session:demo",
          authMode: "session",
          contentType: "news",
        }),
      }),
    });
  });
});

describe("auditMetadataFromContext", () => {
  it("認証コンテキストから metadata を組み立てる", () => {
    expect(
      auditMetadataFromContext(
        {
          mode: "admin",
          siteId: "site-1",
          token: "k",
          scope: "write",
          actorId: "admin:site-1",
        },
        { slug: "demo" },
      ),
    ).toEqual({
      actorId: "admin:site-1",
      authMode: "admin",
      slug: "demo",
    });
  });
});
