import { validateStoredAdminApiKeyGlobal, validateStoredApiKey } from "./api-key";
import { verifySignedPreviewToken } from "../preview/signed-preview-token";
import { getAuthProvider } from "./production-config";
import { resolveProductionSession } from "./session-bridge";
import type { SiteRole } from "./roles";

export type AuthMode = "public" | "admin" | "session" | "preview";

export interface AuthContext {
  mode: AuthMode;
  siteId: string;
  token: string;
  scope: "read" | "write";
  actorId: string;
  /** 本番認証導入後にセッションから設定（Phase 3 骨格） */
  userId?: string;
  /** サイト内ロール（resolveAdminRequest で付与） */
  siteRole?: SiteRole;
}

export type { AdminPermission, SiteRole } from "./roles";
export {
  ADMIN_PERMISSIONS,
  SITE_MEMBER_ROLES,
  hasPermission,
  isRoleEnforcementEnabled,
  meetsMinimumRole,
  roleRank,
} from "./roles";
export { applySitePermission, checkSitePermission } from "./admin-access";
export type { AdminAccessOptions } from "./admin-access";

export interface AuthFailure {
  status: 401 | 403;
  code: string;
  error: string;
}

export type AuthResult = { ok: true; context: AuthContext } | { ok: false; failure: AuthFailure };

const DEV_PUBLIC_KEY = "public-dev-key";
const DEV_ADMIN_KEY = "admin-dev-key";
const DEV_PREVIEW_TOKEN = "preview-dev-token";
const DEV_SESSION_TOKEN = "session-dev-token";

function makeFailure(status: 401 | 403, code: string, error: string): AuthResult {
  return { ok: false, failure: { status, code, error } };
}

function normalizeEnvSuffix(siteId: string): string {
  return siteId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}

function getConfiguredKey(
  prefix: "CMS_PUBLIC_API_KEY" | "CMS_ADMIN_API_KEY" | "CMS_PREVIEW_TOKEN" | "CMS_SESSION_TOKEN",
  siteId?: string,
): string | null {
  if (siteId) {
    const siteScopedKey = `${prefix}_${normalizeEnvSuffix(siteId)}`;
    if (process.env[siteScopedKey]) {
      return process.env[siteScopedKey] ?? null;
    }
  }

  return process.env[prefix] ?? null;
}

function getHeaderValue(request: Request, names: string[]): string | null {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return match[1].trim() || null;
}

function readRequestToken(request: Request, headerNames: string[]): string | null {
  return readBearerToken(request) ?? getHeaderValue(request, headerNames);
}

function isDevFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

function buildAuthContext(
  mode: AuthMode,
  siteId: string,
  token: string,
  scope: "read" | "write",
): AuthResult {
  return {
    ok: true,
    context: {
      mode,
      siteId,
      token,
      scope,
      actorId: `${mode}:${siteId}`,
    },
  };
}

async function validateKey(
  request: Request,
  siteId: string,
  keyPrefix: "CMS_PUBLIC_API_KEY" | "CMS_ADMIN_API_KEY",
  fallbackToken: string,
  mode: AuthMode,
  scope: "read" | "write",
  headerNames: string[],
  kind: "public" | "admin",
): Promise<AuthResult> {
  const providedToken = readRequestToken(request, headerNames);
  if (!providedToken) {
    return makeFailure(401, "missing_api_key", "API key is required.");
  }

  if (await validateStoredApiKey(siteId, providedToken, kind)) {
    return buildAuthContext(mode, siteId, providedToken, scope);
  }

  const configuredKey = getConfiguredKey(keyPrefix, siteId);
  if (configuredKey) {
    if (providedToken !== configuredKey) {
      return makeFailure(403, "invalid_api_key", "API key is invalid.");
    }
  } else if (!isDevFallbackAllowed() || providedToken !== fallbackToken) {
    return makeFailure(403, "invalid_api_key", "API key is invalid.");
  }

  return buildAuthContext(mode, siteId, providedToken, scope);
}

export async function validatePublicApiKey(request: Request, siteId: string): Promise<AuthResult> {
  return validateKey(request, siteId, "CMS_PUBLIC_API_KEY", DEV_PUBLIC_KEY, "public", "read", [
    "x-api-key",
    "x-public-api-key",
  ], "public");
}

export async function validateAdminApiKey(request: Request, siteId: string): Promise<AuthResult> {
  return validateKey(request, siteId, "CMS_ADMIN_API_KEY", DEV_ADMIN_KEY, "admin", "write", [
    "x-api-key",
    "x-admin-api-key",
  ], "admin");
}

export async function validateSession(request: Request, siteId: string): Promise<AuthResult> {
  const providedToken =
    getHeaderValue(request, ["x-session-token"]) ??
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("cms_session="))
      ?.slice("cms_session=".length) ??
    null;

  if (!providedToken) {
    return makeFailure(401, "missing_session", "Session is required.");
  }

  if (getAuthProvider() !== "none") {
    const productionSession = await resolveProductionSession(request, providedToken);
    if (productionSession) {
      return {
        ok: true,
        context: {
          mode: "session",
          siteId,
          token: providedToken,
          scope: "write",
          actorId: `user:${productionSession.userId}`,
          userId: productionSession.userId,
        },
      };
    }
  }

  const configuredToken = getConfiguredKey("CMS_SESSION_TOKEN", siteId);
  if (configuredToken) {
    if (providedToken !== configuredToken) {
      return makeFailure(403, "invalid_session", "Session is invalid.");
    }
  } else if (!isDevFallbackAllowed() || providedToken !== DEV_SESSION_TOKEN) {
    return makeFailure(403, "invalid_session", "Session is invalid.");
  }

  return buildAuthContext("session", siteId, providedToken, "write");
}

export async function validatePreviewToken(request: Request, siteId: string): Promise<AuthResult> {
  const url = new URL(request.url);
  const providedToken = url.searchParams.get("previewToken")?.trim() ?? getHeaderValue(request, ["x-preview-token"]);

  if (!providedToken) {
    return makeFailure(401, "missing_preview_token", "Preview token is required.");
  }

  const configuredToken = getConfiguredKey("CMS_PREVIEW_TOKEN", siteId);
  if (configuredToken && providedToken === configuredToken) {
    return buildAuthContext("preview", siteId, providedToken, "read");
  }

  if (verifySignedPreviewToken(providedToken, siteId)) {
    return buildAuthContext("preview", siteId, providedToken, "read");
  }

  if (configuredToken) {
    return makeFailure(403, "invalid_preview_token", "Preview token is invalid.");
  }

  if (!isDevFallbackAllowed() || providedToken !== DEV_PREVIEW_TOKEN) {
    return makeFailure(403, "invalid_preview_token", "Preview token is invalid.");
  }

  return buildAuthContext("preview", siteId, providedToken, "read");
}

export async function validateAdminAccess(request: Request, siteId: string): Promise<AuthResult> {
  const adminResult = await validateAdminApiKey(request, siteId);
  if (adminResult.ok) {
    return adminResult;
  }

  return validateSession(request, siteId);
}

export async function validateGlobalAdminAccess(request: Request): Promise<AuthResult> {
  const providedToken = readRequestToken(request, ["x-api-key", "x-admin-api-key"]);
  if (providedToken) {
    if (await validateStoredAdminApiKeyGlobal(providedToken)) {
      return buildAuthContext("admin", "*", providedToken, "write");
    }

    const configuredKey = getConfiguredKey("CMS_ADMIN_API_KEY");
    if (configuredKey) {
      if (providedToken !== configuredKey) {
        return makeFailure(403, "invalid_api_key", "API key is invalid.");
      }
      return buildAuthContext("admin", "*", providedToken, "write");
    }

    if (isDevFallbackAllowed() && providedToken === DEV_ADMIN_KEY) {
      return buildAuthContext("admin", "*", providedToken, "write");
    }
  }

  const sessionResult = await validateSession(request, "*");
  if (sessionResult.ok) {
    return sessionResult;
  }

  return makeFailure(401, "missing_api_key", "API key is required.");
}

export const authDevTokens = {
  public: DEV_PUBLIC_KEY,
  admin: DEV_ADMIN_KEY,
  preview: DEV_PREVIEW_TOKEN,
  session: DEV_SESSION_TOKEN,
};
