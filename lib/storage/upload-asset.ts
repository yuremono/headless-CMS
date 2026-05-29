import { createAsset } from "@/lib/db/assets";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { getStorageProvider, validateImageUpload } from "@/lib/storage";
import { StorageValidationError, type AssetUploadResult } from "@/lib/storage/types";

function normalizeAlt(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeActorId(actorId: string): string | null {
  if (!actorId || actorId.includes(":")) {
    return null;
  }

  return actorId;
}

export async function uploadSiteAsset(input: {
  siteIdOrSlug: string;
  file: File;
  alt?: FormDataEntryValue | null;
  actorId: string;
}): Promise<AssetUploadResult> {
  const siteId = await resolveSiteId(input.siteIdOrSlug);
  if (!siteId) {
    throw new StorageValidationError("site_not_found", "Site was not found.");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const validated = validateImageUpload({
    buffer,
    declaredMimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
  });

  const stored = await getStorageProvider().upload({
    siteId,
    buffer: validated.buffer,
    originalFilename: input.file.name || "upload",
    mimeType: validated.mimeType,
  });

  return createAsset({
    siteId,
    url: stored.url,
    filename: stored.filename,
    mimeType: stored.mimeType,
    size: stored.size,
    width: stored.width,
    height: stored.height,
    alt: normalizeAlt(input.alt ?? null),
    createdBy: normalizeActorId(input.actorId),
  });
}

export function mapUploadError(error: unknown): { status: number; code: string; error: string } {
  if (error instanceof StorageValidationError) {
    const status = error.code === "site_not_found" ? 404 : 400;
    return { status, code: error.code, error: error.message };
  }

  if (error instanceof Error && error.message.includes("R2 storage is not implemented")) {
    return { status: 501, code: "storage_not_configured", error: error.message };
  }

  return { status: 500, code: "upload_failed", error: "Failed to upload asset." };
}
