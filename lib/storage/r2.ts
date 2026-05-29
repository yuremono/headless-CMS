import type { StorageProvider, StoredFile, UploadInput } from "./types";

export class R2StorageProvider implements StorageProvider {
  async upload(_input: UploadInput): Promise<StoredFile> {
    throw new Error("R2 storage is not implemented yet. Set STORAGE_PROVIDER=local for MVP uploads.");
  }
}
