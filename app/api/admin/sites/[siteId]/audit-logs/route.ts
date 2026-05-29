import { listAuditLogs } from "@/lib/db/audit-logs";
import { errorResponse, jsonResponse, parsePagination } from "@/lib/http";
import { resolveAdminRequest } from "@/lib/content/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "audit:read" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const url = new URL(request.url);
  const { limit, offset } = parsePagination(url.searchParams);
  const result = await listAuditLogs(siteId, { limit, offset });

  if (!result) {
    return errorResponse(404, "site_not_found", "Site was not found.");
  }

  return jsonResponse(result);
}
