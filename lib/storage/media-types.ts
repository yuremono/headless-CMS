export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];
export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

const MIME_EXTENSION_MAP: Record<AllowedMediaMimeType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
};

/** Browser file input の accept 属性用 */
export const MEDIA_ACCEPT_ATTRIBUTE = ALLOWED_MEDIA_MIME_TYPES.join(",");

/** 拡張子から MIME を推定（ブラウザが type を空で送る場合の補助） */
const EXTENSION_MIME_MAP: Record<string, AllowedMediaMimeType> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
};

const MIME_ALIASES: Record<string, AllowedMediaMimeType> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

export function isAllowedMediaMimeType(value: string): value is AllowedMediaMimeType {
  return (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(value);
}

export function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function isAllowedVideoMimeType(value: string): value is AllowedVideoMimeType {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(value);
}

export function normalizeDeclaredMimeType(value: string, filename?: string): AllowedMediaMimeType | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "application/octet-stream") {
    return inferMimeTypeFromFilename(filename);
  }

  if (isAllowedMediaMimeType(trimmed)) {
    return trimmed;
  }

  const aliased = MIME_ALIASES[trimmed];
  if (aliased) {
    return aliased;
  }

  return inferMimeTypeFromFilename(filename);
}

export function inferMimeTypeFromFilename(filename?: string): AllowedMediaMimeType | null {
  if (!filename) {
    return null;
  }

  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension) {
    return null;
  }

  return EXTENSION_MIME_MAP[extension] ?? null;
}

export function extensionForMimeType(mimeType: AllowedMediaMimeType): string {
  return MIME_EXTENSION_MAP[mimeType];
}
