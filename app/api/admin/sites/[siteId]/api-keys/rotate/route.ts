import { rotateSiteApiKeys } from "@/lib/db/api-keys";
import { errorResponse, jsonResponse } from "@/lib/http";
import { resolveAdminRequest } from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, {
    permission: "api_key:manage",
  });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const result = await rotateSiteApiKeys(siteId);
  if (!result.ok) {
    return errorResponse(result.status, result.code, result.error);
  }

  await recordAuditFromContext(resolved.context, siteId, "api_key.rotate", "api_key", siteId);

  return jsonResponse({ apiKeys: result.apiKeys });
}
