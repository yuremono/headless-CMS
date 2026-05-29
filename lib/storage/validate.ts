import {
  ALLOWED_IMAGE_MIME_TYPES,
  getMaxUploadBytes,
  isAllowedImageMimeType,
  type AllowedImageMimeType,
} from "./config";
import { StorageValidationError } from "./types";

const MIME_SIGNATURES: Array<{ mimeType: AllowedImageMimeType; check: (buffer: Buffer) => boolean }> = [
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
];

function detectMimeType(buffer: Buffer): AllowedImageMimeType | null {
  for (const signature of MIME_SIGNATURES) {
    if (signature.check(buffer)) {
      return signature.mimeType;
    }
  }

  return null;
}

export interface ValidatedUploadFile {
  buffer: Buffer;
  mimeType: AllowedImageMimeType;
  size: number;
}

export function validateImageUpload(input: {
  buffer: Buffer;
  declaredMimeType: string;
  size: number;
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

  if (!isAllowedImageMimeType(input.declaredMimeType)) {
    throw new StorageValidationError(
      "invalid_mime_type",
      `MIME type must be one of: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}.`,
    );
  }

  const detectedMimeType = detectMimeType(input.buffer);
  if (!detectedMimeType) {
    throw new StorageValidationError("invalid_file_content", "File content is not a supported image.");
  }

  if (detectedMimeType !== input.declaredMimeType) {
    throw new StorageValidationError("mime_type_mismatch", "Declared MIME type does not match file content.");
  }

  return {
    buffer: input.buffer,
    mimeType: detectedMimeType,
    size: input.size,
  };
}
