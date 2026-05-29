import { unstable_cache } from "next/cache";
import { validatePreviewToken, validatePublicApiKey, type AuthResult } from "@/lib/auth";
import { parseBooleanQuery, parsePagination } from "@/lib/http";
import {
  deliveryItemTag,
  deliveryListTag,
  resolveCanonicalSiteId,
} from "@/lib/content/delivery-tags";
import type { ContentCollectionResult, ContentRecord } from "@/lib/content/types";

// 公開コンテンツの安全網 TTL。主たる失効は公開保存時の revalidateTag（即時）で行う。
const DELIVERY_DATA_CACHE_REVALIDATE_SECONDS = 3600;

export interface ResolveDeliveryRequestResult {
  auth: AuthResult;
  includeDraft: boolean;
}

export async function resolveDeliveryRequest(
  request: Request,
  siteId: string,
  searchParams: URLSearchParams,
): Promise<ResolveDeliveryRequestResult> {
  const includeDraft = parseBooleanQuery(searchParams.get("draft"));
  const publicAuth = await validatePublicApiKey(request, siteId);
  if (!publicAuth.ok) {
    return { auth: publicAuth, includeDraft };
  }

  if (!includeDraft) {
    return { auth: publicAuth, includeDraft };
  }

  const previewAuth = await validatePreviewToken(request, siteId);
  if (!previewAuth.ok) {
    return { auth: previewAuth, includeDraft };
  }

  return { auth: previewAuth, includeDraft: true };
}

export async function getDeliveryContent(
  siteId: string,
  contentType: string,
  id: string,
  includeDraft: boolean,
): Promise<ContentRecord | null> {
  const { getContent } = await import("@/lib/content/store");

  // ドラフト/プレビューは常に最新を返す（キャッシュしない）。
  if (includeDraft) {
    return getContent(siteId, contentType, id, true);
  }

  const canonicalSiteId = await resolveCanonicalSiteId(siteId);
  const cached = unstable_cache(
    () => getContent(canonicalSiteId, contentType, id, false),
    ["delivery-content-item", canonicalSiteId, contentType, id],
    {
      tags: [deliveryItemTag(canonicalSiteId, contentType, id)],
      revalidate: DELIVERY_DATA_CACHE_REVALIDATE_SECONDS,
    },
  );
  return cached();
}

export async function listDeliveryContents(
  siteId: string,
  contentType: string,
  searchParams: URLSearchParams,
  includeDraft: boolean,
): Promise<ContentCollectionResult> {
  const { limit, offset } = parsePagination(searchParams);
  const slug = searchParams.get("slug");
  const { listContents } = await import("@/lib/content/store");

  if (includeDraft) {
    return listContents({ siteId, contentType, includeDraft: true, limit, offset, slug });
  }

  const canonicalSiteId = await resolveCanonicalSiteId(siteId);
  const cached = unstable_cache(
    () => listContents({ siteId: canonicalSiteId, contentType, includeDraft: false, limit, offset, slug }),
    [
      "delivery-content-list",
      canonicalSiteId,
      contentType,
      String(limit),
      String(offset),
      slug ?? "",
    ],
    {
      tags: [deliveryListTag(canonicalSiteId, contentType)],
      revalidate: DELIVERY_DATA_CACHE_REVALIDATE_SECONDS,
    },
  );
  return cached();
}
