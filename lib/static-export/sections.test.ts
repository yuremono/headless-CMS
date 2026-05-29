import { describe, expect, it } from "vitest";
import { renderPageHero, renderSection, renderSections } from "./sections";

const heroSectionFixture = {
  type: "hero",
  id: "hero-1",
  data: {
    title: "Welcome",
    lead: "Lead copy",
    image: { url: "https://example.com/hero.jpg", alt: "Hero" },
    button: { label: "Contact", href: "/contact" },
  },
};

const textBlockFixture = {
  type: "textBlock",
  id: "text-1",
  data: {
    title: "About",
    body: "<p>Rich <strong>body</strong></p>",
  },
};

describe("static-export sections", () => {
  it("renders hero section with escaped text and image", () => {
    const html = renderSection(heroSectionFixture);

    expect(html).toContain('data-section-type="hero"');
    expect(html).toContain('id="hero-1"');
    expect(html).toContain("Welcome");
    expect(html).toContain("https://example.com/hero.jpg");
    expect(html).toContain('href="/contact"');
  });

  it("renders textBlock with raw body html", () => {
    const html = renderSection(textBlockFixture);

    expect(html).toContain("About");
    expect(html).toContain("<p>Rich <strong>body</strong></p>");
  });

  it("renders page hero from dataJson.hero shape", () => {
    const html = renderPageHero({
      title: "Page title",
      lead: "Page lead",
    });

    expect(html).toContain("preview_page_hero");
    expect(html).toContain("Page title");
    expect(html).toContain("Page lead");
  });

  it("renders multiple sections wrapper", () => {
    const html = renderSections([heroSectionFixture, textBlockFixture]);

    expect(html).toContain('class="preview_sections"');
    expect(html).toContain("Welcome");
    expect(html).toContain("About");
  });

  it("falls back for unknown section types", () => {
    const html = renderSection({ type: "customWidget", id: "x", data: { foo: 1 } });

    expect(html).toContain("customWidget");
    expect(html).toContain("preview_section__fallback");
  });
});
