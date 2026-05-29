import { revalidateTag, unstable_cache } from "next/cache";
import { resolveSiteId } from "@/lib/db/site-resolver";

// サイトのスラッグ/ID 解決はほぼ不変なので Data Cache に載せ、タグ算出のための DB アクセスを抑える。
const SITE_RESOLVE_REVALIDATE_SECONDS = 3600;

const resolveSiteIdCached = unstable_cache(
  (siteIdOrSlug: string) => resolveSiteId(siteIdOrSlug),
  ["delivery-resolve-site-id"],
  { revalidate: SITE_RESOLVE_REVALIDATE_SECONDS },
);

export async function resolveCanonicalSiteId(siteIdOrSlug: string): Promise<string> {
  try {
    return (await resolveSiteIdCached(siteIdOrSlug)) ?? siteIdOrSlug;
  } catch {
    // request スコープ外（seed/テスト）では解決をスキップし、入力値をそのまま使う。
    return siteIdOrSlug;
  }
}

export function deliveryItemTag(canonicalSiteId: string, contentType: string, idOrSlug: string): string {
  return `delivery:item:${canonicalSiteId}:${contentType}:${idOrSlug}`;
}

export function deliveryListTag(canonicalSiteId: string, contentType: string): string {
  return `delivery:list:${canonicalSiteId}:${contentType}`;
}

export interface RevalidateDeliveryOptions {
  id?: string | null;
  slug?: string | null;
}

/**
 * 公開コンテンツの変更時に、配信 API の Data Cache（および Vercel の CDN）を即時失効させる。
 * 次回リクエストでブロッキング再検証が走り、フロントへほぼ即時に反映される。
 */
export async function revalidateDeliveryContent(
  siteIdOrSlug: string,
  contentType: string,
  options: RevalidateDeliveryOptions = {},
): Promise<void> {
  const canonicalSiteId = await resolveCanonicalSiteId(siteIdOrSlug);

  const tags = new Set<string>([deliveryListTag(canonicalSiteId, contentType)]);
  if (options.id) {
    tags.add(deliveryItemTag(canonicalSiteId, contentType, options.id));
  }
  if (options.slug) {
    tags.add(deliveryItemTag(canonicalSiteId, contentType, options.slug));
  }

  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      // request スコープ外では revalidateTag が利用できないため握りつぶす。
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[delivery-cache] revalidateTag('${tag}') skipped`, error);
      }
    }
  }
}
