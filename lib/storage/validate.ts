import {
  ALLOWED_MEDIA_MIME_TYPES,
  getMaxUploadBytes,
  isAllowedMediaMimeType,
  normalizeDeclaredMimeType,
  type AllowedMediaMimeType,
} from "./config";
import { StorageValidationError } from "./types";

interface MimeSignature {
  mimeType: AllowedMediaMimeType;
  check: (buffer: Buffer) => boolean;
}

function hasFtypBrand(buffer: Buffer, brands: string[]): boolean {
  if (buffer.length < 12) {
    return false;
  }

  if (buffer.toString("ascii", 4, 8) !== "ftyp") {
    return false;
  }

  const majorBrand = buffer.toString("ascii", 8, 12);
  return brands.includes(majorBrand);
}

const MIME_SIGNATURES: MimeSignature[] = [
  {
    mimeType: "image/jpeg",
    check: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mimeType: "image/png",
    check: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mimeType: "image/gif",
    check: (buffer) =>
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61,
  },
  {
    mimeType: "image/webp",
    check: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
  {
    mimeType: "image/svg+xml",
    check: (buffer) => {
      const text = buffer.toString("utf8", 0, Math.min(buffer.length, 4096)).trimStart();
      return text.startsWith("<svg") || text.startsWith("<?xml") && text.includes("<svg");
    },
  },
  {
    mimeType: "image/avif",
    check: (buffer) => hasFtypBrand(buffer, ["avif", "avis"]),
  },
  {
    mimeType: "image/heic",
    check: (buffer) => hasFtypBrand(buffer, ["heic", "heix", "hevc", "hevx"]),
  },
  {
    mimeType: "image/heif",
    check: (buffer) => hasFtypBrand(buffer, ["mif1", "msf1", "heif"]),
  },
  {
    mimeType: "video/mp4",
    check: (buffer) => hasFtypBrand(buffer, ["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "M4A "]),
  },
  {
    mimeType: "video/quicktime",
    check: (buffer) => hasFtypBrand(buffer, ["qt  "]),
  },
  {
    mimeType: "video/webm",
    check: (buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
  },
  {
    mimeType: "video/x-msvideo",
    check: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "AVI ",
  },
];

function detectMimeType(buffer: Buffer): AllowedMediaMimeType | null {
  for (const signature of MIME_SIGNATURES) {
    if (signature.check(buffer)) {
      return signature.mimeType;
    }
  }

  return null;
}

export interface ValidatedUploadFile {
  buffer: Buffer;
  mimeType: AllowedMediaMimeType;
  size: number;
}

export function validateMediaUpload(input: {
  buffer: Buffer;
  declaredMimeType: string;
  size: number;
  filename?: string;
}): ValidatedUploadFile {
  const maxBytes = getMaxUploadBytes();

  if (input.size <= 0) {
    throw new StorageValidationError("empty_file", "Uploaded file is empty.");
  }

  if (input.size > maxBytes) {
    throw new StorageValidationError(
      "file_too_large",
      `File exceeds the maximum size of ${maxBytes} bytes.`,
    );
  }

  const detectedMimeType = detectMimeType(input.buffer);
  if (!detectedMimeType) {
    throw new StorageValidationError("invalid_file_content", "File content is not a supported image or video.");
  }

  const normalizedDeclared = normalizeDeclaredMimeType(input.declaredMimeType, input.filename);

  if (normalizedDeclared && normalizedDeclared !== detectedMimeType) {
    // ブラウザ宣言と実体が異なる場合は検出結果を優先（Mac HEIC 等）
    if (!isAllowedMediaMimeType(normalizedDeclared)) {
      throw new StorageValidationError(
        "invalid_mime_type",
        `MIME type must be one of: ${ALLOWED_MEDIA_MIME_TYPES.join(", ")}.`,
      );
    }
  }

  return {
    buffer: input.buffer,
    mimeType: detectedMimeType,
    size: input.size,
  };
}

/** @deprecated validateMediaUpload を使用 */
export const validateImageUpload = validateMediaUpload;
