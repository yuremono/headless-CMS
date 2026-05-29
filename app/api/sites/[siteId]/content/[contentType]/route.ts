import { errorResponse, jsonResponse } from "@/lib/http";
import { getDeliveryContent, listDeliveryContents, resolveDeliveryRequest } from "@/lib/content/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string }> },
): Promise<Response> {
  const { siteId, contentType } = await params;
  const url = new URL(request.url);
  const resolved = await resolveDeliveryRequest(request, siteId, url.searchParams);

  if (!resolved.auth.ok) {
    return errorResponse(resolved.auth.failure.status, resolved.auth.failure.code, resolved.auth.failure.error);
  }

  const collection = await listDeliveryContents(siteId, contentType, url.searchParams, resolved.includeDraft);
  return jsonResponse(collection);
}
