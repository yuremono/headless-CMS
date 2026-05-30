import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeContentDataJson } from "./data-json";

const contentTypesDir = path.join(process.cwd(), "content-types");

const newsSchema = {
  apiName: "news",
  label: "お知らせ",
  type: "collection",
  fields: [
    { name: "title", label: "タイトル", type: "text" },
    { name: "body", label: "本文", type: "richText" },
    {
      name: "seo",
      label: "SEO",
      type: "object",
      fields: [{ name: "description", label: "説明", type: "richText" }],
    },
    {
      name: "sections",
      label: "セクション",
      type: "sectionArray",
      allowedSections: [
        {
          type: "textBlock",
          label: "テキスト",
          fields: [{ name: "content", label: "内容", type: "richText" }],
        },
        {
          type: "faq",
          label: "FAQ",
          fields: [
            {
              name: "items",
              label: "FAQ項目",
              type: "array",
              item: {
                name: "item",
                label: "FAQ項目",
                type: "object",
                fields: [{ name: "answer", label: "回答", type: "richText" }],
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("sanitizeContentDataJson", () => {
  it("richText フィールドの HTML をサニタイズする", async () => {
    const dataJson = {
      title: "Hello",
      body: '<p>OK</p><script>alert(1)</script>',
    };

    const result = await sanitizeContentDataJson(dataJson, newsSchema);
    expect(result.title).toBe("Hello");
    expect(result.body).toBe("<p>OK</p>");
  });

  it("object 内の richText もサニタイズする", async () => {
    const dataJson = {
      seo: { description: '<em>desc</em><script>x</script>' },
    };

    const result = await sanitizeContentDataJson(dataJson, newsSchema);
    expect(result.seo).toEqual({ description: "<em>desc</em>" });
  });

  it("sectionArray 内の richText をサニタイズする", async () => {
    const dataJson = {
      sections: [
        {
          type: "textBlock",
          data: { content: '<p>section</p><script>bad</script>' },
        },
      ],
    };

    const result = await sanitizeContentDataJson(dataJson, newsSchema);
    expect(result.sections).toEqual([
      {
        type: "textBlock",
        data: { content: "<p>section</p>" },
      },
    ]);
  });

  it("sectionArray 内のネスト array（FAQ）の richText もサニタイズする", async () => {
    const dataJson = {
      sections: [
        {
          type: "faq",
          id: "sec_faq_001",
          data: {
            title: "FAQ",
            items: [
              {
                id: "faq_1",
                question: "Q1",
                answer: '<p>OK</p><script>bad</script>',
              },
            ],
          },
        },
      ],
    };

    const result = await sanitizeContentDataJson(dataJson, newsSchema);
    expect(result.sections).toEqual([
      {
        type: "faq",
        id: "sec_faq_001",
        data: {
          title: "FAQ",
          items: [{ id: "faq_1", question: "Q1", answer: "<p>OK</p>" }],
        },
      },
    ]);
  });

  it("content-types/topPage.json スキーマで sectionArray 内 richText をサニタイズする", async () => {
    const topPageSchema = JSON.parse(
      await readFile(path.join(contentTypesDir, "topPage.json"), "utf8"),
    ) as Record<string, unknown>;

    const dataJson = {
      seo: { title: "Top", description: "desc" },
      hero: { title: "Hero" },
      sections: [
        {
          type: "textBlock",
          id: "sec_text_001",
          data: {
            title: "Block",
            body: '<p>safe</p><script>x</script>',
          },
        },
        {
          type: "cardList",
          id: "sec_cards_001",
          data: {
            title: "Cards",
            cards: [
              {
                id: "card_1",
                title: "Card 1",
                body: '<em>card</em><script>bad</script>',
              },
            ],
          },
        },
      ],
    };

    const result = await sanitizeContentDataJson(dataJson, topPageSchema);
    const sections = result.sections as Array<{ type: string; data: Record<string, unknown> }>;

    expect(sections[0].data.body).toBe("<p>safe</p>");
    const cards = sections[1].data.cards as Array<{ body: string }>;
    expect(cards[0].body).toBe("<em>card</em>");
    expect(result.seo).toEqual({ title: "Top", description: "desc" });
    expect(result.hero).toEqual({ title: "Hero" });
  });

  it("textBlock の title のみ（body 空）でもサニタイズを通過する", async () => {
    const topPageSchema = JSON.parse(
      await readFile(path.join(contentTypesDir, "topPage.json"), "utf8"),
    ) as Record<string, unknown>;

    const dataJson = {
      sections: [
        {
          type: "textBlock",
          id: "sec_text_title_only",
          data: {
            title: "タイトルのみ",
            body: "",
          },
        },
      ],
    };

    const result = await sanitizeContentDataJson(dataJson, topPageSchema);
    const sections = result.sections as Array<{ type: string; data: Record<string, unknown> }>;
    expect(sections[0].data.title).toBe("タイトルのみ");
    expect(sections[0].data.body).toBe("");
  });

  it("cardList の cards 内 richText をサニタイズする", async () => {
    const topPageSchema = JSON.parse(
      await readFile(path.join(contentTypesDir, "topPage.json"), "utf8"),
    ) as Record<string, unknown>;

    const dataJson = {
      sections: [
        {
          type: "cardList",
          id: "sec_cards_001",
          data: {
            title: "Cards",
            cards: [
              {
                id: "card_1",
                title: "Card 1",
                body: '<p>card</p><script>bad</script>',
              },
            ],
          },
        },
      ],
    };

    const result = await sanitizeContentDataJson(dataJson, topPageSchema);
    const sections = result.sections as Array<{ type: string; data: Record<string, unknown> }>;
    const cards = sections[0].data.cards as Array<{ body: string }>;
    expect(cards[0].body).toBe("<p>card</p>");
  });

  it("スキーマが不正な場合は dataJson をそのまま返す", async () => {
    const dataJson = { body: "<script>x</script>" };
    const result = await sanitizeContentDataJson(dataJson, { invalid: true });
    expect(result).toStrictEqual(dataJson);
  });

  it("sectionArray の allowedSections に fields が無い場合は data を変更しない", async () => {
    const schemaWithoutFields = {
      apiName: "page",
      label: "ページ",
      type: "collection",
      fields: [
        {
          name: "sections",
          label: "セクション",
          type: "sectionArray",
          allowedSections: [{ type: "hero", label: "ヒーロー" }],
        },
      ],
    };

    const dataJson = {
      sections: [
        {
          type: "hero",
          id: "sec_hero_001",
          data: { title: "Hero", body: '<script>bad</script>' },
        },
      ],
    };

    const result = await sanitizeContentDataJson(dataJson, schemaWithoutFields);
    expect(result.sections).toEqual(dataJson.sections);
  });
  it("トップレベルでスキーマに無いフィールドは変更しない", async () => {
    const dataJson = {
      title: "Hello",
      extra: '<script>keep</script>',
    };

    const result = await sanitizeContentDataJson(dataJson, newsSchema);
    expect(result.extra).toBe('<script>keep</script>');
  });
});
