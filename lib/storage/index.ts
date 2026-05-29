import { getStorageProviderName } from "./config";
import { LocalStorageProvider } from "./local";
import { R2StorageProvider } from "./r2";
import type { StorageProvider } from "./types";

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  cachedProvider = getStorageProviderName() === "r2" ? new R2StorageProvider() : new LocalStorageProvider();
  return cachedProvider;
}

export { validateImageUpload } from "./validate";
export type { AssetUploadResult, StoredFile, StorageProvider } from "./types";
export { StorageValidationError } from "./types";
