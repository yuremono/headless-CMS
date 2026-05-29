import { describe, expect, it } from "vitest";
import type { ContentRecord } from "@/lib/content/types";
import { DEFAULT_CSS_HREF } from "./paths";
import { renderContentPage } from "./render-page";

function makeContent(overrides: Partial<ContentRecord> = {}): ContentRecord {
  return {
    id: "content-abc",
    siteId: "site-1",
    contentType: "topPage",
    slug: "home",
    title: "Home Page",
    status: "published",
    dataJson: {
      seo: { title: "SEO Home" },
      hero: { title: "Hero headline", lead: "Hero lead" },
      sections: [
        {
          type: "textBlock",
          id: "intro",
          data: { title: "Intro", body: "Intro body" },
        },
      ],
    },
    createdBy: null,
    updatedBy: null,
    publishedAt: "2026-05-29T00:00:00.000Z",
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  };
}

describe("renderContentPage", () => {
  it("produces a full HTML document with css link and sections", () => {
    const html = renderContentPage(makeContent(), { siteSlug: "main-site" });

    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain(`href="${DEFAULT_CSS_HREF}"`);
    expect(html).toContain("<title>SEO Home</title>");
    expect(html).toContain("Hero headline");
    expect(html).toContain("Intro body");
    expect(html).toContain('data-section-type="textBlock"');
    expect(html).toContain("main-site");
    expect(html).toContain("Published");
  });

  it("uses content id when slug is missing", () => {
    const html = renderContentPage(
      makeContent({ slug: null, title: "Fallback title", dataJson: { sections: [] } }),
      { siteSlug: "main-site" },
    );

    expect(html).toContain("<title>Fallback title</title>");
    expect(html).toContain("content-abc");
  });

  it("labels draft status in header", () => {
    const html = renderContentPage(makeContent({ status: "draft" }), { siteSlug: "main-site" });

    expect(html).toContain("Draft");
  });
});
