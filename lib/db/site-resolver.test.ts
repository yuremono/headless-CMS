import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    site: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";
import { resolveSite, resolveSiteId } from "./site-resolver";

const mockedFindFirst = vi.mocked(prisma.site.findFirst);

const now = new Date("2026-05-29T00:00:00.000Z");

describe("resolveSite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("id でサイトを解決する", async () => {
    mockedFindFirst.mockResolvedValue({
      id: "site-uuid",
      name: "Main",
      slug: "main-site",
      createdAt: now,
      updatedAt: now,
    });

    const site = await resolveSite("site-uuid");

    expect(site?.id).toBe("site-uuid");
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: "site-uuid" }, { slug: "site-uuid" }] },
    });
  });

  it("見つからない場合は null", async () => {
    mockedFindFirst.mockResolvedValue(null);

    expect(await resolveSite("missing")).toBeNull();
  });
});

describe("resolveSiteId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("slug から site id を返す", async () => {
    mockedFindFirst.mockResolvedValue({
      id: "site-uuid",
      name: "Main",
      slug: "main-site",
      createdAt: now,
      updatedAt: now,
    });

    expect(await resolveSiteId("main-site")).toBe("site-uuid");
  });

  it("サイトが無い場合は null", async () => {
    mockedFindFirst.mockResolvedValue(null);

    expect(await resolveSiteId("unknown")).toBeNull();
  });
});
