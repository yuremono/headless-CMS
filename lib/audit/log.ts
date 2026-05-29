import type { Prisma } from "@prisma/client";
import type { AuthContext } from "@/lib/auth";
import { resolveSiteId } from "@/lib/db/site-resolver";

export interface RecordAuditLogInput {
  siteId: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRecord {
  id: string;
  siteId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function mapAuditLogRecord(log: {
  id: string;
  siteId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  createdAt: Date;
}): AuditLogRecord {
  const metadata =
    log.metadata !== null && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? (log.metadata as Record<string, unknown>)
      : {};

  return {
    id: log.id,
    siteId: log.siteId,
    userId: log.userId,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    metadata,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function recordAuditLog(input: RecordAuditLogInput): Promise<AuditLogRecord> {
  const { prisma } = await import("@/lib/db/prisma");
  const log = await prisma.auditLog.create({
    data: {
      siteId: input.siteId,
      userId: input.userId ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return mapAuditLogRecord(log);
}

export function auditMetadataFromContext(
  context: AuthContext,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    actorId: context.actorId,
    authMode: context.mode,
    ...extra,
  };
}

export async function recordAuditFromContext(
  context: AuthContext,
  siteIdOrSlug: string,
  action: string,
  resource: string,
  resourceId?: string | null,
  extraMetadata?: Record<string, unknown>,
): Promise<void> {
  const siteId = (await resolveSiteId(siteIdOrSlug)) ?? siteIdOrSlug;

  await recordAuditLog({
    siteId,
    userId: context.userId ?? null,
    action,
    resource,
    resourceId,
    metadata: auditMetadataFromContext(context, extraMetadata),
  });
}
