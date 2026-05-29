import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applySitePermission, checkSitePermission } from "./admin-access";
import type { AuthContext } from "./index";

const originalEnv = { ...process.env };

const okAuth = {
  ok: true as const,
  context: {
    mode: "session" as const,
    siteId: "site-1",
    token: "t",
    scope: "write" as const,
    actorId: "session:site-1",
  } satisfies AuthContext,
};

describe("checkSitePermission", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PHASE3_ENFORCE_ROLES;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("強制無効時は常に null（許可）", () => {
    expect(checkSitePermission("viewer", "content:write")).toBeNull();
  });

  it("強制有効時は不足ロールで forbidden", () => {
    process.env.PHASE3_ENFORCE_ROLES = "true";
    const failure = checkSitePermission("viewer", "content:write");
    expect(failure).toEqual({
      status: 403,
      code: "forbidden",
      error: "Insufficient permissions for this action.",
    });
  });

  it("applySitePermission は siteRole を context に付与", () => {
    const result = applySitePermission(okAuth, "admin", undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.siteRole).toBe("admin");
    }
  });
});
