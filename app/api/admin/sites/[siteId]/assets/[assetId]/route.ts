import { errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import { patchAdminAsset, resolveAdminRequest } from "@/lib/content/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string; assetId: string }> },
): Promise<Response> {
  const { siteId, assetId } = await params;
  const resolved = await resolveAdminRequest(request, siteId);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse(400, "invalid_body", "Request body must be valid JSON.");
  }

  const result = await patchAdminAsset(siteId, assetId, body);

  if (!result) {
    return errorResponse(404, "site_not_found", "Site was not found.");
  }

  if ("error" in result) {
    if (result.error === "missing_alt") {
      return errorResponse(400, "missing_alt", "Field `alt` is required.");
    }

    return errorResponse(404, "asset_not_found", "Asset was not found.");
  }

  return jsonResponse(result.asset);
}
