/**
 * 配信 API / プレビュー API からコンテンツを取得する。
 */

function buildContentUrl(config) {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const { siteId, contentType, contentId, slug, previewToken } = config;

  let path;
  if (contentId) {
    path = `/api/sites/${encodeURIComponent(siteId)}/content/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`;
  } else {
    path = `/api/sites/${encodeURIComponent(siteId)}/content/${encodeURIComponent(contentType)}`;
  }

  const url = new URL(`${base}${path}`);

  if (slug && !contentId) {
    url.searchParams.set("slug", slug);
  }

  if (previewToken) {
    url.searchParams.set("draft", "true");
    url.searchParams.set("previewToken", previewToken);
  }

  return url;
}

/**
 * @param {import("./config.js").defaultConfig} config
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchContent(config) {
  if (!config.siteId) {
    throw new Error("siteId が未設定です。config.js または URL クエリ ?siteId=... を指定してください。");
  }

  const url = buildContentUrl(config);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "x-api-key": config.publicApiKey,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `API request failed (${response.status})`;
    throw new Error(message);
  }

  if (payload && Array.isArray(payload.items)) {
    if (payload.items.length === 0) {
      throw new Error("コンテンツが見つかりませんでした。");
    }
    return payload.items[0];
  }

  return payload;
}

/**
 * @param {Record<string, unknown>} content
 * @param {boolean} isDraft
 */
export function buildStatusLabel(content, isDraft) {
  const status = typeof content.status === "string" ? content.status : "unknown";
  const title =
    (typeof content.title === "string" && content.title) ||
    (typeof content.dataJson === "object" &&
      content.dataJson !== null &&
      typeof content.dataJson.seo === "object" &&
      content.dataJson.seo !== null &&
      typeof content.dataJson.seo.title === "string" &&
      content.dataJson.seo.title) ||
    "Untitled";

  return isDraft ? `Preview (draft): ${title}` : `Published: ${title} [${status}]`;
}
