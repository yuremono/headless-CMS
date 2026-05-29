import { cache } from "react";
import { cookies } from "next/headers";
import { validateSession } from "./index";
import { resolveActorSiteRole, resolveGlobalActorRole } from "./site-role";
import { hasPermission, isRoleEnforcementEnabled, type SiteRole } from "./roles";

export interface AdminUiAccess {
  enforceRoles: boolean;
  siteRole: SiteRole;
  /** コンテンツ編集・削除・公開など書き込み UI を隠す */
  readOnly: boolean;
  canManageSite: boolean;
  canRotateApiKeys: boolean;
  canManageMembers: boolean;
  canReadAuditLogs: boolean;
}

const FULL_ACCESS: AdminUiAccess = {
  enforceRoles: false,
  siteRole: "owner",
  readOnly: false,
  canManageSite: true,
  canRotateApiKeys: true,
  canManageMembers: true,
  canReadAuditLogs: true,
};

function buildAccess(siteRole: SiteRole): AdminUiAccess {
  return {
    enforceRoles: true,
    siteRole,
    readOnly: !hasPermission(siteRole, "content:write"),
    canManageSite: hasPermission(siteRole, "site:write"),
    canRotateApiKeys: hasPermission(siteRole, "api_key:manage"),
    canManageMembers: hasPermission(siteRole, "member:manage"),
    canReadAuditLogs: hasPermission(siteRole, "audit:read"),
  };
}

async function readSessionRequest(): Promise<Request> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("cms_session")?.value?.trim() ?? "";
  const headers = new Headers();

  if (sessionToken) {
    headers.set("cookie", `cms_session=${sessionToken}`);
  }

  return new Request("http://localhost/admin-ui-access", { headers });
}

/**
 * 管理画面 UI の権限を解決する。
 * `PHASE3_ENFORCE_ROLES` 未設定時は従来どおり全操作を表示する。
 */
export async function resolveAdminUiAccess(siteId?: string): Promise<AdminUiAccess> {
  if (!isRoleEnforcementEnabled()) {
    return FULL_ACCESS;
  }

  const request = await readSessionRequest();
  const authResult = await validateSession(request, siteId ?? "*");

  if (!authResult.ok) {
    return buildAccess("viewer");
  }

  const siteRole = siteId
    ? await resolveActorSiteRole(siteId, authResult.context)
    : await resolveGlobalActorRole(authResult.context);

  return buildAccess(siteRole);
}

/** 同一リクエスト内で AdminLayout と page が重複解決しないよう cache する */
export const getAdminUiAccess = cache(resolveAdminUiAccess);
