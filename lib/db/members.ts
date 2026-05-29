import type { SiteMember, SiteMemberRole, User } from "@prisma/client";
import { SITE_MEMBER_ROLES } from "@/lib/auth/roles";
import { prisma } from "./prisma";
import { resolveSiteId } from "./site-resolver";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SiteMemberRecord {
  id: string;
  siteId: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: SiteMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface SiteMemberCollection {
  items: SiteMemberRecord[];
  total: number;
}

type MemberWithUser = SiteMember & { user: User };

export function mapSiteMemberRecord(member: MemberWithUser): SiteMemberRecord {
  return {
    id: member.id,
    siteId: member.siteId,
    userId: member.userId,
    email: member.user.email,
    name: member.user.name,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function isSiteMemberRole(value: unknown): value is SiteMemberRole {
  return typeof value === "string" && (SITE_MEMBER_ROLES as readonly string[]).includes(value);
}

async function countSiteOwners(siteId: string): Promise<number> {
  return prisma.siteMember.count({
    where: { siteId, role: "owner" },
  });
}

export async function listSiteMembers(siteIdOrSlug: string): Promise<SiteMemberCollection | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const members = await prisma.siteMember.findMany({
    where: { siteId },
    include: { user: true },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  return {
    items: members.map(mapSiteMemberRecord),
    total: members.length,
  };
}

export type InviteSiteMemberFailure = {
  ok: false;
  status: 400 | 404 | 409;
  code: string;
  error: string;
};

export type InviteSiteMemberSuccess = {
  ok: true;
  member: SiteMemberRecord;
};

export type InviteSiteMemberResult = InviteSiteMemberSuccess | InviteSiteMemberFailure;

export async function inviteSiteMember(
  siteIdOrSlug: string,
  input: { email?: unknown; role?: unknown },
): Promise<InviteSiteMemberResult> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return {
      ok: false,
      status: 404,
      code: "site_not_found",
      error: "Site was not found.",
    };
  }

  if (typeof input.email !== "string" || !EMAIL_PATTERN.test(input.email.trim())) {
    return {
      ok: false,
      status: 400,
      code: "invalid_email",
      error: "A valid email address is required.",
    };
  }

  if (!isSiteMemberRole(input.role)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_role",
      error: "Role must be one of: owner, admin, editor, viewer.",
    };
  }

  const email = input.email.trim().toLowerCase();
  const role = input.role;

  const existingMember = await prisma.siteMember.findFirst({
    where: {
      siteId,
      user: { email },
    },
    select: { id: true },
  });

  if (existingMember) {
    return {
      ok: false,
      status: 409,
      code: "member_exists",
      error: "This user is already a member of the site.",
    };
  }

  const member = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    return tx.siteMember.create({
      data: {
        siteId,
        userId: user.id,
        role,
      },
      include: { user: true },
    });
  });

  return {
    ok: true,
    member: mapSiteMemberRecord(member),
  };
}

export type UpdateSiteMemberFailure = {
  ok: false;
  status: 400 | 404 | 409;
  code: string;
  error: string;
};

export type UpdateSiteMemberSuccess = {
  ok: true;
  member: SiteMemberRecord;
};

export type UpdateSiteMemberResult = UpdateSiteMemberSuccess | UpdateSiteMemberFailure;

export async function updateSiteMemberRole(
  siteIdOrSlug: string,
  memberId: string,
  input: { role?: unknown },
): Promise<UpdateSiteMemberResult> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return {
      ok: false,
      status: 404,
      code: "site_not_found",
      error: "Site was not found.",
    };
  }

  if (!isSiteMemberRole(input.role)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_role",
      error: "Role must be one of: owner, admin, editor, viewer.",
    };
  }

  const existing = await prisma.siteMember.findFirst({
    where: { id: memberId, siteId },
    include: { user: true },
  });

  if (!existing) {
    return {
      ok: false,
      status: 404,
      code: "member_not_found",
      error: "Site member was not found.",
    };
  }

  const nextRole = input.role;

  if (existing.role === "owner" && nextRole !== "owner") {
    const ownerCount = await countSiteOwners(siteId);
    if (ownerCount <= 1) {
      return {
        ok: false,
        status: 409,
        code: "last_owner",
        error: "Cannot change the role of the last owner.",
      };
    }
  }

  const member = await prisma.siteMember.update({
    where: { id: memberId },
    data: { role: nextRole },
    include: { user: true },
  });

  return {
    ok: true,
    member: mapSiteMemberRecord(member),
  };
}

export type RemoveSiteMemberFailure = {
  ok: false;
  status: 404 | 409;
  code: string;
  error: string;
};

export type RemoveSiteMemberSuccess = {
  ok: true;
};

export type RemoveSiteMemberResult = RemoveSiteMemberSuccess | RemoveSiteMemberFailure;

export async function removeSiteMember(
  siteIdOrSlug: string,
  memberId: string,
): Promise<RemoveSiteMemberResult> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return {
      ok: false,
      status: 404,
      code: "site_not_found",
      error: "Site was not found.",
    };
  }

  const existing = await prisma.siteMember.findFirst({
    where: { id: memberId, siteId },
    select: { id: true, role: true },
  });

  if (!existing) {
    return {
      ok: false,
      status: 404,
      code: "member_not_found",
      error: "Site member was not found.",
    };
  }

  if (existing.role === "owner") {
    const ownerCount = await countSiteOwners(siteId);
    if (ownerCount <= 1) {
      return {
        ok: false,
        status: 409,
        code: "last_owner",
        error: "Cannot remove the last owner from the site.",
      };
    }
  }

  await prisma.siteMember.delete({ where: { id: memberId } });

  return { ok: true };
}
