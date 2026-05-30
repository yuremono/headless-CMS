import { errorResponse, jsonResponse } from "@/lib/http";
import { getFieldManifest, resolveAdminRequest } from "@/lib/content/service";

export const runtime = "nodejs";

/**
 * フィールドマニフェスト（定義済みパス + format）。
 * フロントの検証ツールが data-cms 属性と突き合わせ、タイポ・改名を検出するために使う。
 */
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
  const id = url.searchParams.get("id");

  return jsonResponse({
    siteId,
    ...(await getFieldManifest(siteId, contentType, id)),
  });
}
