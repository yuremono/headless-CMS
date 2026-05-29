/**
 * プレビューデモの表示モード。
 * - api: 配信 / プレビュー API から fetch（要 CMS + 任意で静的サーバー）
 * - generated-hub: エクスポート済み HTML の案内（?generated=1 または /generated/）
 */
export const PreviewMode = {
  Api: "api",
  GeneratedHub: "generated-hub",
};

/**
 * @returns {typeof PreviewMode[keyof typeof PreviewMode]}
 */
export function detectPreviewMode(locationLike = window.location) {
  const params = new URLSearchParams(locationLike.search);

  if (params.get("generated") === "1") {
    return PreviewMode.GeneratedHub;
  }

  const pathname = locationLike.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/generated" || pathname.endsWith("/generated")) {
    return PreviewMode.GeneratedHub;
  }

  return PreviewMode.Api;
}

/**
 * エクスポート HTML を file:// または静的サーバーで直接開いているか。
 * この場合 index.html / main.js は関与しない。
 */
export function isStandaloneGeneratedPage(locationLike = window.location) {
  return /\/generated\/[^/]+\.html$/i.test(locationLike.pathname);
}
