import type { ContentRecord } from "@/lib/content/types";
import { DEFAULT_CSS_HREF } from "./paths";
import { renderPageHero, renderSections } from "./sections";

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readSections(dataJson: Record<string, unknown>): unknown[] {
  const sections = dataJson.sections ?? dataJson.sectionArray;
  return Array.isArray(sections) ? sections : [];
}

function resolveDocumentTitle(content: ContentRecord, dataJson: Record<string, unknown>): string {
  const seo = dataJson.seo;
  if (seo && typeof seo === "object" && seo !== null && !Array.isArray(seo)) {
    const seoTitle = (seo as Record<string, unknown>).title;
    if (typeof seoTitle === "string" && seoTitle.trim()) {
      return seoTitle.trim();
    }
  }

  if (typeof content.title === "string" && content.title.trim()) {
    return content.title.trim();
  }

  return "Preview Export";
}

function renderMeta(content: ContentRecord, siteSlug: string): string {
  const data = content.dataJson;
  const seo = data.seo && typeof data.seo === "object" && !Array.isArray(data.seo) ? data.seo : null;
  const seoTitle =
    seo && typeof (seo as Record<string, unknown>).title === "string"
      ? (seo as Record<string, unknown>).title
      : null;

  return `<aside class="preview_meta" aria-label="Content metadata">
    <dl>
      <dt>Content type</dt><dd>${escapeHtml(content.contentType)}</dd>
      <dt>Content ID</dt><dd>${escapeHtml(content.id)}</dd>
      <dt>Status</dt><dd>${escapeHtml(content.status)}</dd>
      <dt>Site</dt><dd>${escapeHtml(siteSlug)}</dd>
      ${seoTitle ? `<dt>SEO title</dt><dd>${escapeHtml(String(seoTitle))}</dd>` : ""}
    </dl>
  </aside>`;
}

export interface RenderContentPageOptions {
  siteSlug: string;
  cssHref?: string;
  includeMeta?: boolean;
}

export function renderContentPage(
  content: ContentRecord,
  options: RenderContentPageOptions,
): string {
  const dataJson = content.dataJson;
  const sections = readSections(dataJson);
  const title = resolveDocumentTitle(content, dataJson);
  const cssHref = options.cssHref ?? DEFAULT_CSS_HREF;
  const statusLabel =
    content.status === "published"
      ? "Published"
      : content.status === "draft"
        ? "Draft"
        : "Unpublished";

  const bodyParts = [
    options.includeMeta !== false ? renderMeta(content, options.siteSlug) : "",
    renderPageHero(dataJson.hero),
    renderSections(sections),
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${escapeHtml(cssHref)}" />
  </head>
  <body>
    <header class="preview_header">
      <p class="preview_header__label">Static preview export</p>
      <p class="preview_header__status">${escapeHtml(statusLabel)}</p>
    </header>
    <main class="preview_main">
      ${bodyParts.join("\n      ")}
    </main>
    <footer class="preview_footer">
      <p>Generated from CMS data. Not a production frontend.</p>
    </footer>
  </body>
</html>
`;
}
