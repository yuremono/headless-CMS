import { mapAuditLogRecord, type AuditLogRecord } from "@/lib/audit/log";
import { prisma } from "./prisma";
import { resolveSiteId } from "./site-resolver";

export interface AuditLogCollectionResult {
  items: AuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
}

export async function listAuditLogs(
  siteIdOrSlug: string,
  options: { limit?: number; offset?: number } = {},
): Promise<AuditLogCollectionResult | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where: { siteId } }),
  ]);

  return {
    items: items.map(mapAuditLogRecord),
    total,
    limit,
    offset,
  };
}
