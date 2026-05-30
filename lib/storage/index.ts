import { BlobStorageProvider } from "./blob";
import { getStorageProviderName } from "./config";
import { LocalStorageProvider } from "./local";
import { R2StorageProvider } from "./r2";
import type { StorageProvider } from "./types";

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = getStorageProviderName();

  if (providerName === "r2") {
    cachedProvider = new R2StorageProvider();
  } else if (providerName === "blob") {
    cachedProvider = new BlobStorageProvider();
  } else {
    cachedProvider = new LocalStorageProvider();
  }

  return cachedProvider;
}

export { validateMediaUpload, validateImageUpload } from "./validate";
export type { AssetUploadResult, StoredFile, StorageProvider } from "./types";
export { StorageValidationError } from "./types";
export {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MEDIA_ACCEPT_ATTRIBUTE,
} from "./config";
