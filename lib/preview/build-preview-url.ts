import { resolvePreviewToken } from "./get-preview-token";

export type PreviewContentKind = "single" | "collection";

export interface BuildPreviewUrlInput {
  siteId: string;
  contentType: string;
  kind: PreviewContentKind;
  contentId?: string;
  slug?: string;
  previewToken?: string;
}

export function getFrontendBaseUrl(): string | null {
  const base = process.env.FRONTEND_BASE_URL?.trim();
  return base || null;
}

/**
 * フロントエンドプレビュー URL を組み立てる。
 * FRONTEND_BASE_URL のクエリ形式: ?siteId=&contentType=&previewToken=&slug|contentId=
 */
export function buildPreviewUrl(input: BuildPreviewUrlInput): string | null {
  const baseUrl = getFrontendBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const previewToken = input.previewToken ?? resolvePreviewToken(input.siteId);
  if (!previewToken) {
    return null;
  }

  const url = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  url.searchParams.set("siteId", input.siteId);
  url.searchParams.set("contentType", input.contentType);
  url.searchParams.set("previewToken", previewToken);

  if (input.kind === "single") {
    if (input.contentId) {
      url.searchParams.set("contentId", input.contentId);
    }
  } else if (input.slug) {
    url.searchParams.set("slug", input.slug);
  }

  return url.toString();
}
