import { getDashboardSnapshot } from "@/lib/db/sites";
import { errorResponse, jsonResponse } from "@/lib/http";
import { resolveGlobalAdminRequest } from "@/lib/content/service";

export async function GET(request: Request): Promise<Response> {
  const resolved = await resolveGlobalAdminRequest(request);

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  return jsonResponse(await getDashboardSnapshot());
}
