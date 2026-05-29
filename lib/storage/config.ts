export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const MIME_EXTENSION_MAP: Record<AllowedImageMimeType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function getMaxUploadBytes(): number {
  const configured = Number(process.env.UPLOAD_MAX_BYTES ?? "");
  if (Number.isFinite(configured) && configured > 0) {
    return Math.trunc(configured);
  }

  return DEFAULT_MAX_UPLOAD_BYTES;
}

export function getStorageProviderName(): "local" | "r2" {
  const configured = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (configured === "r2") {
    return "r2";
  }

  return "local";
}

export function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function extensionForMimeType(mimeType: AllowedImageMimeType): string {
  return MIME_EXTENSION_MAP[mimeType];
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
