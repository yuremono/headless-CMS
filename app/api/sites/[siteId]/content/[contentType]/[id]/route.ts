import { deliveryErrorResponse, deliveryJsonResponse } from "@/lib/http";
import { getDeliveryContent, resolveDeliveryRequest } from "@/lib/content/delivery";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string; contentType: string; id: string }> },
): Promise<Response> {
  try {
    const { siteId, contentType, id } = await params;
    const url = new URL(request.url);
    const resolved = await resolveDeliveryRequest(request, siteId, url.searchParams);

    if (!resolved.auth.ok) {
      return deliveryErrorResponse(
        resolved.auth.failure.status,
        resolved.auth.failure.code,
        resolved.auth.failure.error,
      );
    }

    const content = await getDeliveryContent(siteId, contentType, id, resolved.includeDraft);
    if (!content) {
      return deliveryErrorResponse(404, "content_not_found", "Content not found.");
    }

    return deliveryJsonResponse(content, resolved.includeDraft, "item");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[delivery-api]", error);
    return deliveryErrorResponse(500, "internal_error", message);
  }
}
