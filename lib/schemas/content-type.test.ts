import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getContentTypeFilePath,
  parseContentTypeDefinition,
  readContentTypeDefinition,
  readContentTypeDefinitions,
} from "./content-type";

const contentTypesDir = path.join(process.cwd(), "content-types");

const validDefinition = {
  apiName: "news",
  label: "お知らせ",
  type: "collection" as const,
  fields: [
    { name: "title", label: "タイトル", type: "text" as const, required: true },
    { name: "body", label: "本文", type: "richText" as const },
  ],
};

describe("parseContentTypeDefinition", () => {
  it("有効な定義をパースできる", () => {
    const result = parseContentTypeDefinition(validDefinition);
    expect(result.apiName).toBe("news");
    expect(result.fields).toHaveLength(2);
  });

  it("apiName が camelCase でない場合は拒否する", () => {
    expect(() =>
      parseContentTypeDefinition({
        ...validDefinition,
        apiName: "News",
      }),
    ).toThrow();
  });

  it("フィールド名が重複する場合は拒否する", () => {
    expect(() =>
      parseContentTypeDefinition({
        ...validDefinition,
        fields: [
          { name: "title", label: "A", type: "text" },
          { name: "title", label: "B", type: "text" },
        ],
      }),
    ).toThrow(/Duplicate field name/);
  });

  it("select フィールドは options が必須", () => {
    expect(() =>
      parseContentTypeDefinition({
        ...validDefinition,
        fields: [{ name: "category", label: "カテゴリ", type: "select" }],
      }),
    ).toThrow();
  });

  it("reference フィールドは targetApiName が必須", () => {
    expect(() =>
      parseContentTypeDefinition({
        ...validDefinition,
        fields: [{ name: "related", label: "関連", type: "reference" }],
      }),
    ).toThrow();
  });

  it("object フィールドはネストした fields が必須", () => {
    expect(() =>
      parseContentTypeDefinition({
        ...validDefinition,
        fields: [{ name: "seo", label: "SEO", type: "object" }],
      }),
    ).toThrow();
  });

  it("sectionArray フィールドは allowedSections が必須", () => {
    expect(() =>
      parseContentTypeDefinition({
        ...validDefinition,
        fields: [{ name: "sections", label: "セクション", type: "sectionArray" }],
      }),
    ).toThrow();
  });

  it("ネストした object / array フィールドを受け付ける", () => {
    const result = parseContentTypeDefinition({
      apiName: "page",
      label: "ページ",
      type: "collection",
      fields: [
        {
          name: "seo",
          label: "SEO",
          type: "object",
          fields: [
            { name: "title", label: "タイトル", type: "text" },
            { name: "description", label: "説明", type: "textarea" },
          ],
        },
        {
          name: "tags",
          label: "タグ",
          type: "array",
          item: { name: "tag", label: "タグ", type: "text" },
        },
      ],
    });

    expect(result.fields).toHaveLength(2);
    expect(result.fields[0].type).toBe("object");
    expect(result.fields[1].type).toBe("array");
  });

  it("allowedSections の fields に richText / ネスト array を受け付ける", () => {
    const result = parseContentTypeDefinition({
      apiName: "topPage",
      label: "トップページ",
      type: "single",
      fields: [
        {
          name: "sections",
          label: "セクション",
          type: "sectionArray",
          allowedSections: [
            {
              type: "textBlock",
              label: "テキストブロック",
              fields: [{ name: "body", label: "本文", type: "richText" }],
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
    });

    const sectionsField = result.fields[0];
    expect(sectionsField.type).toBe("sectionArray");
    if (sectionsField.type !== "sectionArray") {
      return;
    }

    const textBlock = sectionsField.allowedSections.find((entry) => entry.type === "textBlock");
    expect(textBlock?.fields?.[0].type).toBe("richText");
  });
});

describe("getContentTypeFilePath", () => {
  it("apiName から JSON ファイルパスを返す", () => {
    expect(getContentTypeFilePath("news", contentTypesDir)).toBe(
      path.join(contentTypesDir, "news.json"),
    );
  });
});

describe("readContentTypeDefinition", () => {
  it("content-types の JSON を読み込める", async () => {
    const definition = await readContentTypeDefinition(path.join(contentTypesDir, "news.json"));
    expect(definition.apiName).toBe("news");
    expect(definition.type).toBe("collection");
    expect(definition.fields.length).toBeGreaterThan(0);
  });

  it("topPage.json の sectionArray に richText fields が定義されている", async () => {
    const definition = await readContentTypeDefinition(path.join(contentTypesDir, "topPage.json"));
    const sectionsField = definition.fields.find((field) => field.name === "sections");

    expect(sectionsField?.type).toBe("sectionArray");
    if (!sectionsField || sectionsField.type !== "sectionArray") {
      return;
    }

    const textBlock = sectionsField.allowedSections.find((entry) => entry.type === "textBlock");
    expect(textBlock?.fields?.some((field) => field.type === "richText")).toBe(true);
  });
});

describe("readContentTypeDefinitions", () => {
  it("content-types ディレクトリ内の全 JSON を読み込める", async () => {
    const records = await readContentTypeDefinitions(contentTypesDir);
    const apiNames = records.map((record) => record.definition.apiName).sort();

    expect(records.length).toBeGreaterThanOrEqual(3);
    expect(apiNames).toContain("news");
    expect(apiNames).toContain("page");
    expect(apiNames).toContain("topPage");

    for (const record of records) {
      const raw = await readFile(record.filePath, "utf8");
      expect(record.filePath.endsWith(".json")).toBe(true);
      expect(record.definition.apiName).toBe(JSON.parse(raw).apiName);
    }
  });
});
