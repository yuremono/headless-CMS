import { createSite } from "@/lib/db/create-site";
import { listSiteSummaries } from "@/lib/db/sites";
import { errorResponse, isPlainObject, jsonResponse, readJsonBody } from "@/lib/http";
import { resolveGlobalAdminRequest } from "@/lib/content/service";
import { recordAuditLog, auditMetadataFromContext } from "@/lib/audit/log";

export async function GET(request: Request): Promise<Response> {
  const resolved = await resolveGlobalAdminRequest(request, { permission: "site:read" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  return jsonResponse(await listSiteSummaries());
}

export async function POST(request: Request): Promise<Response> {
  const resolved = await resolveGlobalAdminRequest(request, { permission: "site:write" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const body = await readJsonBody(request);
  if (!body || !isPlainObject(body)) {
    return errorResponse(400, "invalid_request_body", "Request body must be a JSON object.");
  }

  const result = await createSite(body);
  if (!result.ok) {
    return errorResponse(result.status, result.code, result.error);
  }

  await recordAuditLog({
    siteId: result.site.id,
    userId: resolved.context.userId ?? null,
    action: "site.create",
    resource: "site",
    resourceId: result.site.id,
    metadata: auditMetadataFromContext(resolved.context, { slug: result.site.slug, name: result.site.name }),
  });

  return jsonResponse(
    {
      site: result.site,
      apiKeys: result.apiKeys,
    },
    { status: 201 },
  );
}
