import type { AuthContext, AuthMode } from "./index";
import { authDevTokens } from "./index";
import type { SiteRole } from "./roles";

const DEMO_SESSION_EMAIL = process.env.ADMIN_DEMO_EMAIL ?? "admin@example.com";

function isDevFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

function isDevSessionToken(token: string): boolean {
  return isDevFallbackAllowed() && token === authDevTokens.session;
}

/** 管理 API キーはサイトスコープのサービス主体として owner 相当（キー単位ロールは将来） */
function roleForAuthMode(mode: AuthMode): SiteRole | null {
  if (mode === "admin") {
    return "owner";
  }

  return null;
}

async function lookupSiteMemberRole(siteId: string, userId: string): Promise<SiteRole | null> {
  const { prisma } = await import("@/lib/db/prisma");
  const member = await prisma.siteMember.findUnique({
    where: {
      siteId_userId: {
        siteId,
        userId,
      },
    },
    select: { role: true },
  });

  return member?.role ?? null;
}

async function resolveDemoUserId(): Promise<string | null> {
  const { prisma } = await import("@/lib/db/prisma");
  const user = await prisma.user.findUnique({
    where: { email: DEMO_SESSION_EMAIL },
    select: { id: true },
  });

  return user?.id ?? null;
}

/**
 * 認証済みリクエストのサイト内ロールを解決する。
 * デモセッション・管理 API キーは Phase 3 骨格として owner 相当を返し、既存デモログインを壊さない。
 */
export async function resolveActorSiteRole(
  siteIdOrSlug: string,
  context: AuthContext,
): Promise<SiteRole> {
  const modeRole = roleForAuthMode(context.mode);
  if (modeRole) {
    return modeRole;
  }

  if (context.mode === "session" && isDevSessionToken(context.token)) {
    return "owner";
  }

  const { resolveSiteId } = await import("@/lib/db/site-resolver");
  const resolvedSiteId = await resolveSiteId(siteIdOrSlug);
  if (!resolvedSiteId) {
    return "editor";
  }

  const userId = context.userId ?? (await resolveDemoUserId());
  if (!userId) {
    return "editor";
  }

  const memberRole = await lookupSiteMemberRole(resolvedSiteId, userId);
  return memberRole ?? "editor";
}
