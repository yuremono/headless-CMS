import { errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import {
  createAdminContent,
  listAdminContents,
  listAdminContentsUi,
  resolveAdminRequest,
} from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string }> },
): Promise<Response> {
  const { siteId, contentType } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:read" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "api") {
    return jsonResponse(await listAdminContents(siteId, contentType, url.searchParams));
  }

  return jsonResponse(await listAdminContentsUi(siteId, contentType));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string }> },
): Promise<Response> {
  const { siteId, contentType } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:write" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const body = await readJsonBody(request);
  const content = await createAdminContent(siteId, contentType, body, resolved.context.actorId);
  if (!content) {
    return errorResponse(400, "invalid_request_body", "Request body must be a JSON object.");
  }

  await recordAuditFromContext(resolved.context, siteId, "content.create", "content", content.id, {
    contentType,
    title: content.title,
  });

  return jsonResponse(content, { status: 201 });
}
