import type { AdminPermission, SiteRole } from "./roles";
import {
  hasPermission,
  isRoleEnforcementEnabled,
  permissionDeniedFailure,
} from "./roles";
import type { AuthFailure, AuthResult } from "./index";

export interface AdminAccessOptions {
  /** 未指定時はロール解決のみ（拒否しない） */
  permission?: AdminPermission;
}

function deny(): AuthResult {
  const failure = permissionDeniedFailure();
  return { ok: false, failure };
}

/**
 * 認証成功後にサイトロールで操作を許可するか判定する。
 * `PHASE3_ENFORCE_ROLES` が無効なら常に許可（TODO: 本番で段階的に有効化）。
 */
export function checkSitePermission(
  siteRole: SiteRole,
  permission: AdminPermission | undefined,
): AuthFailure | null {
  if (!permission || !isRoleEnforcementEnabled()) {
    return null;
  }

  if (!hasPermission(siteRole, permission)) {
    return permissionDeniedFailure();
  }

  return null;
}

export function applySitePermission(
  auth: Extract<AuthResult, { ok: true }>,
  siteRole: SiteRole,
  permission: AdminPermission | undefined,
): AuthResult {
  const failure = checkSitePermission(siteRole, permission);
  if (failure) {
    return deny();
  }

  return {
    ok: true,
    context: {
      ...auth.context,
      siteRole,
    },
  };
}
