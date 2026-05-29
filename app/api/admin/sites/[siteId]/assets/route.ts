import { errorResponse, jsonResponse } from "@/lib/http";
import { getAdminAssets, patchAdminAsset, resolveAdminRequest } from "@/lib/content/service";
import { mapUploadError, uploadSiteAsset } from "@/lib/storage/upload-asset";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:read" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const { searchParams } = new URL(request.url);
  const assets = await getAdminAssets(siteId, searchParams);

  if (!assets) {
    return errorResponse(404, "site_not_found", "Site was not found.");
  }

  return jsonResponse(assets);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
): Promise<Response> {
  const { siteId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:write" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    return errorResponse(400, "missing_file", "Multipart field `file` is required.");
  }

  try {
    const asset = await uploadSiteAsset({
      siteIdOrSlug: siteId,
      file: fileEntry,
      alt: formData.get("alt"),
      actorId: resolved.context.actorId,
    });

    return jsonResponse(asset, { status: 201 });
  } catch (cause) {
    const mapped = mapUploadError(cause);
    return errorResponse(mapped.status, mapped.code, mapped.error);
  }
}
