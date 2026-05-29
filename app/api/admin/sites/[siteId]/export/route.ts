import { buildSiteExport } from "@/lib/db/site-export";
import { errorResponse, jsonResponse } from "@/lib/http";
import { resolveAdminRequest } from "@/lib/content/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:read" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const contentType = new URL(request.url).searchParams.get("contentType");
  const payload = await buildSiteExport(siteId, { contentType });

  if (!payload) {
    return errorResponse(404, "site_not_found", "Site was not found.");
  }

  return jsonResponse(payload);
}
