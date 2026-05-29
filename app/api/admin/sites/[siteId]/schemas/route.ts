import { errorResponse, jsonResponse } from "@/lib/http";
import { getSchemas, resolveAdminRequest } from "@/lib/content/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  return jsonResponse(await getSchemas(siteId));
}
