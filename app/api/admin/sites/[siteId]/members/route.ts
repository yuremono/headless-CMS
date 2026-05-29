import { errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import {
  getAdminMembers,
  inviteAdminMember,
  MEMBER_MANAGE_PERMISSION,
  resolveAdminRequest,
} from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, MEMBER_MANAGE_PERMISSION);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const members = await getAdminMembers(siteId);

  if (!members) {
    return errorResponse(404, "site_not_found", "Site was not found.");
  }

  return jsonResponse(members);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, MEMBER_MANAGE_PERMISSION);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse(400, "invalid_body", "Request body must be valid JSON.");
  }

  const result = await inviteAdminMember(siteId, body);

  if (!result.ok) {
    return errorResponse(result.status, result.code, result.error);
  }

  await recordAuditFromContext(resolved.context, siteId, "member.invite", "member", result.member.id, {
    email: result.member.email,
    role: result.member.role,
  });

  return jsonResponse(result.member, { status: 201 });
}
