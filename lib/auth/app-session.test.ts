import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";
import { createAppSession, revokeAppSession, validateAppSession } from "./app-session";

const mockedCreate = vi.mocked(prisma.session.create);
const mockedFindUnique = vi.mocked(prisma.session.findUnique);
const mockedDelete = vi.mocked(prisma.session.delete);
const mockedDeleteMany = vi.mocked(prisma.session.deleteMany);

describe("app-session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("createAppSession はトークンを返し DB に保存", async () => {
    mockedCreate.mockResolvedValue({
      id: "s1",
      sessionToken: "tok",
      userId: "u1",
      expires: new Date(),
    });

    const token = await createAppSession("u1");

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          sessionToken: token,
        }),
      }),
    );
  });

  it("validateAppSession は有効なセッションを返す", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));

    mockedFindUnique.mockResolvedValue({
      id: "s1",
      sessionToken: "valid-token",
      userId: "u1",
      expires: new Date("2026-05-30T12:00:00.000Z"),
      user: { id: "u1", email: "admin@example.com" },
    } as never);

    const result = await validateAppSession("valid-token");

    expect(result).toEqual({
      userId: "u1",
      sessionToken: "valid-token",
      email: "admin@example.com",
    });
  });

  it("validateAppSession は期限切れを null にし削除", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-30T12:00:00.000Z"));

    mockedFindUnique.mockResolvedValue({
      id: "s1",
      sessionToken: "expired",
      userId: "u1",
      expires: new Date("2026-05-29T12:00:00.000Z"),
      user: { id: "u1", email: "admin@example.com" },
    } as never);
    mockedDelete.mockResolvedValue({} as never);

    const result = await validateAppSession("expired");

    expect(result).toBeNull();
    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("revokeAppSession はトークンで削除", async () => {
    mockedDeleteMany.mockResolvedValue({ count: 1 });

    await revokeAppSession("tok");

    expect(mockedDeleteMany).toHaveBeenCalledWith({
      where: { sessionToken: "tok" },
    });
  });
});
