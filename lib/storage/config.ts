export {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MEDIA_ACCEPT_ATTRIBUTE,
  extensionForMimeType,
  inferMimeTypeFromFilename,
  isAllowedImageMimeType,
  isAllowedMediaMimeType,
  isAllowedVideoMimeType,
  normalizeDeclaredMimeType,
  type AllowedImageMimeType,
  type AllowedMediaMimeType,
  type AllowedVideoMimeType,
} from "./media-types";

export const DEFAULT_MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

export function getMaxUploadBytes(): number {
  const configured = Number(process.env.UPLOAD_MAX_BYTES ?? "");
  if (Number.isFinite(configured) && configured > 0) {
    return Math.trunc(configured);
  }

  return DEFAULT_MAX_UPLOAD_BYTES;
}

export type StorageProviderName = "local" | "r2" | "blob";

export function getStorageProviderName(): StorageProviderName {
  const configured = process.env.STORAGE_PROVIDER?.trim().toLowerCase();

  if (configured === "r2") {
    return "r2";
  }

  if (configured === "blob") {
    return "blob";
  }

  // Vercel 上で Blob トークンがある場合は blob を自動選択
  if (process.env.VERCEL === "1" && process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return "blob";
  }

  return "local";
}

export function sanitizeFilename(value: string): string {
  const base = value.split(/[/\\]/).pop() ?? "upload";
  const normalized = base
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return normalized || "upload";
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET_NAME?.trim(),
  );
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}
