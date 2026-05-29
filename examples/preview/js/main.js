import { defaultConfig } from "./config.js";
import { buildStatusLabel, fetchContent } from "./api.js";
import { renderPageHero, renderSections } from "./sections.js";

const QUERY_KEYS = [
  "apiBaseUrl",
  "siteId",
  "contentType",
  "contentId",
  "slug",
  "publicApiKey",
  "previewToken",
];

/**
 * URL クエリと config.js のデフォルトをマージする。
 * 管理画面のプレビューリンク形式:
 * ?siteId=&contentType=&previewToken=&slug= または &contentId=
 */
export function resolveConfig(searchParams = new URLSearchParams(window.location.search)) {
  const config = { ...defaultConfig };

  for (const key of QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null && value.trim() !== "") {
      config[key] = value.trim();
    }
  }

  return config;
}

function readDataJson(content) {
  if (content && typeof content.dataJson === "object" && content.dataJson !== null) {
    return content.dataJson;
  }

  if (content && typeof content.data === "object" && content.data !== null) {
    return content.data;
  }

  return {};
}

function renderMeta(content, config) {
  const data = readDataJson(content);
  const seo = data.seo && typeof data.seo === "object" ? data.seo : null;

  return `<aside class="preview_meta" aria-label="Content metadata">
    <dl>
      <dt>Content type</dt><dd>${escapeHtml(String(content.contentType ?? config.contentType))}</dd>
      <dt>Content ID</dt><dd>${escapeHtml(String(content.id ?? "—"))}</dd>
      <dt>Status</dt><dd>${escapeHtml(String(content.status ?? "—"))}</dd>
      <dt>Site ID</dt><dd>${escapeHtml(config.siteId)}</dd>
      ${seo && seo.title ? `<dt>SEO title</dt><dd>${escapeHtml(String(seo.title))}</dd>` : ""}
    </dl>
  </aside>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(message) {
  const node = document.getElementById("preview_status");
  if (node) {
    node.textContent = message;
  }
}

function setMainHtml(html) {
  const main = document.getElementById("preview_main");
  if (!main) {
    return;
  }

  main.innerHTML = html;
  main.setAttribute("aria-busy", "false");
}

function setError(message) {
  setStatus("Error");
  setMainHtml(`<div class="preview_error" role="alert"><p>${escapeHtml(message)}</p></div>`);
}

async function bootstrap() {
  const config = resolveConfig();

  try {
    const content = await fetchContent(config);
    const data = readDataJson(content);
    const sections = data.sections ?? data.sectionArray ?? [];
    const isDraft = Boolean(config.previewToken) || content.status === "draft";

    setStatus(buildStatusLabel(content, isDraft));

    setMainHtml(`
      ${renderMeta(content, config)}
      ${renderPageHero(data.hero)}
      ${renderSections(sections)}
    `);

    document.title =
      (data.seo && typeof data.seo.title === "string" && data.seo.title) ||
      (typeof content.title === "string" && content.title) ||
      "Preview Demo";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setError(message);
  }
}

bootstrap();
