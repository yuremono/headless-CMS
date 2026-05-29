import type { SiteMemberRole } from "@prisma/client";

/** SPEC 6.9 — サイトメンバーの4ロール（Prisma SiteMemberRole と同一） */
export const SITE_MEMBER_ROLES = ["owner", "admin", "editor", "viewer"] as const satisfies readonly SiteMemberRole[];

export type SiteRole = SiteMemberRole;

/** 管理 API / 管理画面でチェックする操作（Phase 3 で段階的に適用） */
export const ADMIN_PERMISSIONS = [
  "site:read",
  "site:delete",
  "api_key:manage",
  "content_type:manage",
  "member:manage",
  "content:read",
  "content:write",
  "content:publish",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const ROLE_RANK: Record<SiteRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/** ロールごとの許可操作（SPEC 6.9 権限表の最小マッピング） */
const PERMISSIONS_BY_ROLE: Record<SiteRole, ReadonlySet<AdminPermission>> = {
  owner: new Set(ADMIN_PERMISSIONS),
  admin: new Set([
    "site:read",
    "content_type:manage",
    "member:manage",
    "content:read",
    "content:write",
    "content:publish",
  ]),
  editor: new Set(["site:read", "content:read", "content:write", "content:publish"]),
  viewer: new Set(["site:read", "content:read"]),
};

export function roleRank(role: SiteRole): number {
  return ROLE_RANK[role];
}

export function meetsMinimumRole(role: SiteRole, minimum: SiteRole): boolean {
  return roleRank(role) >= roleRank(minimum);
}

export function hasPermission(role: SiteRole, permission: AdminPermission): boolean {
  return PERMISSIONS_BY_ROLE[role].has(permission);
}

/** `PHASE3_ENFORCE_ROLES=true` のときのみ API で拒否する（既定は骨格のみ・全許可） */
export function isRoleEnforcementEnabled(): boolean {
  return process.env.PHASE3_ENFORCE_ROLES === "true";
}

export function permissionDeniedFailure(): {
  status: 403;
  code: string;
  error: string;
} {
  return {
    status: 403,
    code: "forbidden",
    error: "Insufficient permissions for this action.",
  };
}
