import { resolveContentUserId } from "@/lib/auth/content-user";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import {
  createAdminContent,
  listAdminContents,
  listAdminContentsUi,
  resolveAdminRequest,
  updateAdminContent,
} from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export const runtime = "nodejs";

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
  const content = await createAdminContent(
    siteId,
    contentType,
    body,
    resolveContentUserId(resolved.context),
  );
  if (!content) {
    return errorResponse(400, "invalid_request_body", "Request body must be a JSON object.");
  }

  await recordAuditFromContext(resolved.context, siteId, "content.create", "content", content.id, {
    contentType,
    title: content.title,
  });

  return jsonResponse(content, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string }> },
): Promise<Response> {
  const { siteId, contentType } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:write" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return errorResponse(400, "missing_content_id", "Content id is required.");
  }

  try {
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
  } catch (error) {
    console.error("[admin content collection PATCH]", error);
    const message = error instanceof Error ? error.message : "Content update failed.";
    return errorResponse(500, "content_update_failed", message);
  }
}
