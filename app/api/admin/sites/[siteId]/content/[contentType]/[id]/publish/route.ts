import { resolveContentUserId } from "@/lib/auth/content-user";
import { errorResponse, jsonResponse } from "@/lib/http";
import { publishAdminContent, resolveAdminRequest } from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string; id: string }> },
): Promise<Response> {
  const { siteId, contentType, id } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:publish" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const content = await publishAdminContent(
    siteId,
    contentType,
    id,
    resolveContentUserId(resolved.context),
  );
  if (!content) {
    return errorResponse(404, "content_not_found", "Content not found.");
  }

  await recordAuditFromContext(resolved.context, siteId, "content.publish", "content", id, {
    contentType,
    title: content.title,
  });

  return jsonResponse(content);
}
