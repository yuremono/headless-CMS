import { resolveContentUserId } from "@/lib/auth/content-user";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import {
  getAdminContentRecord,
  getDeliveryContent,
  removeAdminContent,
  resolveAdminRequest,
  updateAdminContent,
} from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string; id: string }> },
): Promise<Response> {
  const { siteId, contentType, id } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:read" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "api") {
    const content = await getDeliveryContent(siteId, contentType, id, true);
    if (!content) {
      return errorResponse(404, "content_not_found", "Content not found.");
    }
    return jsonResponse(content);
  }

  const content = await getAdminContentRecord(siteId, contentType, id);
  if (!content) {
    return errorResponse(404, "content_not_found", "Content not found.");
  }

  return jsonResponse(content);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string; id: string }> },
): Promise<Response> {
  const { siteId, contentType, id } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:write" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const body = await readJsonBody(request);
  const content = await updateAdminContent(
    siteId,
    contentType,
    id,
    body,
    resolveContentUserId(resolved.context),
  );
  if (!content) {
    return errorResponse(404, "content_not_found", "Content not found.");
  }

  await recordAuditFromContext(resolved.context, siteId, "content.update", "content", id, {
    contentType,
    title: content.title,
  });

  return jsonResponse(content);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string; id: string }> },
): Promise<Response> {
  const { siteId, contentType, id } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:write" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const deleted = await removeAdminContent(siteId, contentType, id);
  if (!deleted) {
    return errorResponse(404, "content_not_found", "Content not found.");
  }

  await recordAuditFromContext(resolved.context, siteId, "content.delete", "content", id, {
    contentType,
  });

  return new Response(null, { status: 204 });
}
