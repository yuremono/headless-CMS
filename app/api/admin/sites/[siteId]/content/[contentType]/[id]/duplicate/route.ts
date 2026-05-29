import { errorResponse, jsonResponse } from "@/lib/http";
import { duplicateAdminContent, resolveAdminRequest } from "@/lib/content/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string; id: string }> },
): Promise<Response> {
  const { siteId, contentType, id } = await params;
  const resolved = await resolveAdminRequest(request, siteId);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const content = await duplicateAdminContent(siteId, contentType, id, resolved.context.actorId);
  if (!content) {
    return errorResponse(404, "content_not_found", "Content not found.");
  }

  return jsonResponse(content, { status: 201 });
}
