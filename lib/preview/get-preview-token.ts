import { authDevTokens } from "../auth";
import { createSignedPreviewToken, hasPreviewTokenSecret } from "./signed-preview-token";

function normalizeEnvSuffix(siteId: string): string {
  return siteId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
}

function getConfiguredPreviewToken(siteId?: string): string | null {
  if (siteId) {
    const siteScopedKey = `CMS_PREVIEW_TOKEN_${normalizeEnvSuffix(siteId)}`;
    const siteScopedValue = process.env[siteScopedKey]?.trim();
    if (siteScopedValue) {
      return siteScopedValue;
    }
  }

  const globalValue = process.env.CMS_PREVIEW_TOKEN?.trim();
  return globalValue || null;
}

function isDevFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * 管理画面プレビューリンク用トークン。lib/auth の validatePreviewToken と同じ解決順。
 * PREVIEW_TOKEN_SECRET がある場合は署名付きトークンを優先する。
 */
export function resolvePreviewToken(siteId: string): string | null {
  if (hasPreviewTokenSecret()) {
    const signed = createSignedPreviewToken(siteId);
    if (signed) {
      return signed;
    }
  }

  const configured = getConfiguredPreviewToken(siteId);
  if (configured) {
    return configured;
  }

  if (isDevFallbackAllowed()) {
    return authDevTokens.preview;
  }

  return null;
}
