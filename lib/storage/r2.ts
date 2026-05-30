import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { extensionForMimeType, isR2Configured, sanitizeFilename, type AllowedMediaMimeType } from "./config";
import type { StorageProvider, StoredFile, UploadInput } from "./types";

function buildPublicUrl(key: string): string {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const bucket = process.env.R2_BUCKET_NAME?.trim() ?? "";
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export class R2StorageProvider implements StorageProvider {
  async upload(input: UploadInput): Promise<StoredFile> {
    if (!isR2Configured()) {
      throw new Error("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.");
    }

    const bucket = process.env.R2_BUCKET_NAME!.trim();
    const extension = extensionForMimeType(input.mimeType as AllowedMediaMimeType);
    const safeOriginal = sanitizeFilename(input.originalFilename).replace(/\.[^.]+$/, "");
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeOriginal}${extension}`;
    const key = `${input.siteId}/${filename}`;

    const client = createR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    return {
      url: buildPublicUrl(key),
      filename,
      mimeType: input.mimeType,
      size: input.buffer.length,
      width: null,
      height: null,
    };
  }
}
