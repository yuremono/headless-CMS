import type { AuthContext, AuthMode } from "./index";
import { authDevTokens } from "./index";
import { DEV_SESSION_TOKENS } from "./dev-session-tokens";
import { roleRank, type SiteRole } from "./roles";

const DEMO_SESSION_EMAIL = process.env.ADMIN_DEMO_EMAIL ?? "admin@example.com";

function isDevFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

function roleForDevSessionToken(token: string): SiteRole | null {
  if (!isDevFallbackAllowed()) {
    return null;
  }

  if (token === DEV_SESSION_TOKENS.readonly || token === authDevTokens.sessionReadOnly) {
    return "viewer";
  }

  if (
    token === DEV_SESSION_TOKENS.editor ||
    token === authDevTokens.session ||
    token === authDevTokens.sessionEditor
  ) {
    return "owner";
  }

  return null;
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
 * デモセッションは token に応じて viewer / owner を返し、既存デモログインを壊さない。
 */
export async function resolveActorSiteRole(
  siteIdOrSlug: string,
  context: AuthContext,
): Promise<SiteRole> {
  const modeRole = roleForAuthMode(context.mode);
  if (modeRole) {
    return modeRole;
  }

  const devRole = roleForDevSessionToken(context.token);
  if (devRole) {
    return devRole;
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

async function lookupHighestMemberRole(userId: string): Promise<SiteRole | null> {
  const { prisma } = await import("@/lib/db/prisma");
  const members = await prisma.siteMember.findMany({
    where: { userId },
    select: { role: true },
  });

  if (members.length === 0) {
    return null;
  }

  return members.reduce<SiteRole>(
    (best, member) => (roleRank(member.role) > roleRank(best) ? member.role : best),
    members[0].role,
  );
}

/**
 * サイト非依存の管理 API（サイト一覧・作成など）向けロール解決。
 */
export async function resolveGlobalActorRole(context: AuthContext): Promise<SiteRole> {
  const modeRole = roleForAuthMode(context.mode);
  if (modeRole) {
    return modeRole;
  }

  const devRole = roleForDevSessionToken(context.token);
  if (devRole) {
    return devRole;
  }

  const userId = context.userId ?? (await resolveDemoUserId());
  if (!userId) {
    return "editor";
  }

  const highestRole = await lookupHighestMemberRole(userId);
  return highestRole ?? "editor";
}
