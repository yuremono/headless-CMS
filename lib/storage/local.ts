import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { extensionForMimeType, sanitizeFilename, type AllowedImageMimeType } from "./config";
import type { StorageProvider, StoredFile, UploadInput } from "./types";

function buildPublicUrl(siteId: string, filename: string): string {
  return `/uploads/${siteId}/${filename}`;
}

export class LocalStorageProvider implements StorageProvider {
  async upload(input: UploadInput): Promise<StoredFile> {
    const extension = extensionForMimeType(input.mimeType as AllowedImageMimeType);
    const safeOriginal = sanitizeFilename(input.originalFilename).replace(/\.[^.]+$/, "");
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeOriginal}${extension}`;
    const directory = path.join(process.cwd(), "public", "uploads", input.siteId);
    const absolutePath = path.join(directory, filename);

    await mkdir(directory, { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      url: buildPublicUrl(input.siteId, filename),
      filename,
      mimeType: input.mimeType,
      size: input.buffer.length,
      width: null,
      height: null,
    };
  }
}
