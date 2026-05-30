import { describe, expect, it } from "vitest";
import { sanitizeContentDataJson } from "./data-json";

const EMPTY_SCHEMA = {} as Record<string, unknown>;

describe("sanitizeContentDataJson - composable richText", () => {
  it("composableFieldFormats が richText のパスをサニタイズする", async () => {
    const schema = { composableFieldFormats: { "hero.title": "richText" } };
    const data = {
      hero: { title: '<span class="accent">強調</span><script>alert(1)</script>' },
    };

    const result = await sanitizeContentDataJson(data, schema);
    const title = (result.hero as Record<string, unknown>).title as string;

    expect(title).toContain('<span class="accent">強調</span>');
    expect(title).not.toContain("<script>");
  });

  it("plain 指定のパスは変更しない（HTML エスケープしない）", async () => {
    const schema = { composableFieldFormats: { "hero.title": "plain" } };
    const data = { hero: { title: "Tom & Jerry < 2" } };

    const result = await sanitizeContentDataJson(data, schema);
    expect((result.hero as Record<string, unknown>).title).toBe("Tom & Jerry < 2");
  });

  it("composableFieldFormats が無くてもそのまま返す", async () => {
    const data = { hero: { title: "<b>x</b>" } };
    const result = await sanitizeContentDataJson(data, EMPTY_SCHEMA);
    expect((result.hero as Record<string, unknown>).title).toBe("<b>x</b>");
  });

  it("存在しないパスの format 指定は無視する", async () => {
    const schema = { composableFieldFormats: { "missing.path": "richText" } };
    const data = { hero: { title: "x" } };
    const result = await sanitizeContentDataJson(data, schema);
    expect(result).toEqual({ hero: { title: "x" } });
  });
});
