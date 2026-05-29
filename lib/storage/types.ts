export interface StoredFile {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

export interface UploadInput {
  siteId: string;
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
}

export interface AssetUploadResult {
  id: string;
  siteId: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export class StorageValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StorageValidationError";
    this.code = code;
  }
}
