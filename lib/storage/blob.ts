import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { extensionForMimeType, isBlobConfigured, sanitizeFilename, type AllowedMediaMimeType } from "./config";
import type { StorageProvider, StoredFile, UploadInput } from "./types";

export class BlobStorageProvider implements StorageProvider {
  async upload(input: UploadInput): Promise<StoredFile> {
    if (!isBlobConfigured()) {
      throw new Error(
        "Vercel Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN or enable Blob in the Vercel project.",
      );
    }

    const extension = extensionForMimeType(input.mimeType as AllowedMediaMimeType);
    const safeOriginal = sanitizeFilename(input.originalFilename).replace(/\.[^.]+$/, "");
    const filename = `${input.siteId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeOriginal}${extension}`;

    const blob = await put(filename, input.buffer, {
      access: "public",
      contentType: input.mimeType,
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      filename: `${safeOriginal}${extension}`,
      mimeType: input.mimeType,
      size: input.buffer.length,
      width: null,
      height: null,
    };
  }
}
