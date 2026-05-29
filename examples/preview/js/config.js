/**
 * デモ用設定。README の環境変数に相当する値をここで指定する。
 * URL クエリで上書き可能（main.js の resolveConfig 参照）。
 *
 * 既定値は Prisma seed 後の開発環境（main-site）に合わせている。
 */
export const defaultConfig = {
  /** CMS のベース URL（配信 API の origin） */
  apiBaseUrl: "http://localhost:3000",
  /** サイト ID（seed: main-site → cmpqutfrd0001zubo3cya627a） */
  siteId: "cmpqutfrd0001zubo3cya627a",
  /** 取得するコンテンツ種類 */
  contentType: "topPage",
  /** 単一取得時のコンテンツ ID（seed topPage） */
  contentId: "cmpqwarp30009c8bow1pd00fn",
  /** collection 用スラッグ（page 等。topPage 既定時は空） */
  slug: "",
  /** 公開 API キー（開発時デフォルト: public-dev-key） */
  publicApiKey: "public-dev-key",
  /** プレビュートークン（開発時: preview-dev-token） */
  previewToken: "preview-dev-token",
};
