import { errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import {
  deleteAdminMember,
  MEMBER_MANAGE_PERMISSION,
  patchAdminMember,
  resolveAdminRequest,
} from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string; memberId: string }> },
): Promise<Response> {
  const { siteId, memberId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, MEMBER_MANAGE_PERMISSION);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse(400, "invalid_body", "Request body must be valid JSON.");
  }

  const result = await patchAdminMember(siteId, memberId, body);

  if (!result.ok) {
    return errorResponse(result.status, result.code, result.error);
  }

  await recordAuditFromContext(resolved.context, siteId, "member.update", "member", memberId, {
    role: result.member.role,
  });

  return jsonResponse(result.member);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ siteId: string; memberId: string }> },
): Promise<Response> {
  const { siteId, memberId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, MEMBER_MANAGE_PERMISSION);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const result = await deleteAdminMember(siteId, memberId);

  if (!result.ok) {
    return errorResponse(result.status, result.code, result.error);
  }

  await recordAuditFromContext(resolved.context, siteId, "member.remove", "member", memberId);

  return new Response(null, { status: 204 });
}
