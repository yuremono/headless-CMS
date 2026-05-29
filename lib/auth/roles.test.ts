import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_PERMISSIONS,
  hasPermission,
  isRoleEnforcementEnabled,
  meetsMinimumRole,
  roleRank,
} from "./roles";

const originalEnv = { ...process.env };

describe("hasPermission", () => {
  it("owner は全 AdminPermission を許可", () => {
    for (const permission of ADMIN_PERMISSIONS) {
      expect(hasPermission("owner", permission)).toBe(true);
    }
  });

  it("viewer は閲覧系のみ", () => {
    expect(hasPermission("viewer", "site:read")).toBe(true);
    expect(hasPermission("viewer", "content:read")).toBe(true);
    expect(hasPermission("viewer", "content:write")).toBe(false);
    expect(hasPermission("viewer", "api_key:manage")).toBe(false);
  });

  it("editor はコンテンツ書込・公開を許可", () => {
    expect(hasPermission("editor", "content:write")).toBe(true);
    expect(hasPermission("editor", "content:publish")).toBe(true);
    expect(hasPermission("editor", "content_type:manage")).toBe(false);
    expect(hasPermission("editor", "member:manage")).toBe(false);
  });

  it("admin は種類・メンバー管理と公開操作を許可", () => {
    expect(hasPermission("admin", "content_type:manage")).toBe(true);
    expect(hasPermission("admin", "member:manage")).toBe(true);
    expect(hasPermission("admin", "site:delete")).toBe(false);
    expect(hasPermission("admin", "api_key:manage")).toBe(false);
  });
});

describe("meetsMinimumRole / roleRank", () => {
  it("ロール順序 owner > admin > editor > viewer", () => {
    expect(roleRank("owner")).toBeGreaterThan(roleRank("admin"));
    expect(roleRank("admin")).toBeGreaterThan(roleRank("editor"));
    expect(roleRank("editor")).toBeGreaterThan(roleRank("viewer"));
    expect(meetsMinimumRole("editor", "viewer")).toBe(true);
    expect(meetsMinimumRole("viewer", "editor")).toBe(false);
  });
});

describe("isRoleEnforcementEnabled", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PHASE3_ENFORCE_ROLES;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("既定では無効", () => {
    expect(isRoleEnforcementEnabled()).toBe(false);
  });

  it("PHASE3_ENFORCE_ROLES=true で有効", () => {
    process.env.PHASE3_ENFORCE_ROLES = "true";
    expect(isRoleEnforcementEnabled()).toBe(true);
  });
});
