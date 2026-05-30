import { describe, expect, it } from "vitest";
import { buildFieldManifest } from "./field-manifest";

describe("buildFieldManifest", () => {
  it("データの既知 suffix からパスと型を抽出する", () => {
    const manifest = buildFieldManifest(
      "topPage",
      {},
      {
        hero: { title: "見出し", text: "本文", image: { url: "u", alt: "a" }, href: "https://x" },
      },
    );

    expect(manifest.contentType).toBe("topPage");
    expect(manifest.paths).toEqual([
      { path: "hero.href", type: "href", format: "plain" },
      { path: "hero.image.alt", type: "imageAlt", format: "plain" },
      { path: "hero.image.url", type: "imageUrl", format: "plain" },
      { path: "hero.text", type: "text", format: "plain" },
      { path: "hero.title", type: "title", format: "plain" },
    ]);
  });

  it("schema_json.composableFieldFormats の richText を反映する", () => {
    const manifest = buildFieldManifest(
      "topPage",
      { composableFieldFormats: { "hero.title": "richText" } },
      { hero: { title: "見出し" } },
    );

    expect(manifest.paths).toEqual([{ path: "hero.title", type: "title", format: "richText" }]);
  });

  it("データに無くても format 定義済みパスを含める", () => {
    const manifest = buildFieldManifest(
      "topPage",
      { composableFieldFormats: { "hero.text": "richText" } },
      {},
    );

    expect(manifest.paths).toEqual([{ path: "hero.text", type: "text", format: "richText" }]);
  });

  it("既知 suffix に一致しないパスは無視する", () => {
    const manifest = buildFieldManifest("topPage", {}, { hero: { caption: "x" }, count: 3 });
    expect(manifest.paths).toEqual([]);
  });
});
