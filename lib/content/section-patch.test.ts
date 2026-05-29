import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/content/store", () => ({
  getContent: vi.fn(),
  getSchema: vi.fn(),
  updateContent: vi.fn(),
}));

import { getContent, getSchema, updateContent } from "@/lib/content/store";
import {
  applySectionPatch,
  extractSectionPatch,
  findSectionArrayFieldNames,
  findSectionLocation,
  patchContentSection,
} from "./section-patch";

const mockedGetContent = vi.mocked(getContent);
const mockedGetSchema = vi.mocked(getSchema);
const mockedUpdateContent = vi.mocked(updateContent);

const pageSchemaJson = {
  apiName: "page",
  label: "Page",
  type: "single",
  fields: [
    {
      name: "sections",
      label: "Sections",
      type: "sectionArray",
      allowedSections: [
        {
          type: "textBlock",
          label: "Text",
          fields: [{ name: "title", label: "Title", type: "text" }],
        },
      ],
    },
  ],
};

const sampleContent = {
  id: "content-1",
  siteId: "site-1",
  contentType: "page",
  slug: "about",
  title: "About",
  status: "draft" as const,
  dataJson: {
    sections: [
      {
        type: "textBlock",
        id: "sec_text_001",
        visible: true,
        data: { title: "Old title", body: "<p>Old body</p>" },
      },
    ],
  },
  createdBy: "user-1",
  updatedBy: "user-1",
  publishedAt: null,
  createdAt: "2026-05-29T00:00:00.000Z",
  updatedAt: "2026-05-29T00:00:00.000Z",
};

describe("findSectionArrayFieldNames", () => {
  it("sectionArray フィールド名を返す", () => {
    expect(findSectionArrayFieldNames(pageSchemaJson)).toEqual(["sections"]);
  });

  it("不正スキーマは空配列", () => {
    expect(findSectionArrayFieldNames({})).toEqual([]);
  });
});

describe("findSectionLocation", () => {
  it("sectionId で位置を特定する", () => {
    expect(findSectionLocation(sampleContent.dataJson, ["sections"], "sec_text_001")).toEqual({
      fieldName: "sections",
      index: 0,
    });
  });

  it("存在しない sectionId は null", () => {
    expect(findSectionLocation(sampleContent.dataJson, ["sections"], "missing")).toBeNull();
  });
});

describe("extractSectionPatch", () => {
  it("data オブジェクトをマージ対象に抽出する", () => {
    expect(extractSectionPatch({ data: { title: "New" } })).toEqual({
      dataPatch: { title: "New" },
    });
  });

  it("トップレベルフィールドも data にマージする（content PATCH と同様）", () => {
    expect(extractSectionPatch({ title: "New", visible: false })).toEqual({
      visible: false,
      dataPatch: { title: "New" },
    });
  });

  it("type / id は無視する", () => {
    expect(extractSectionPatch({ type: "hero", id: "sec_x", title: "X" })).toEqual({
      dataPatch: { title: "X" },
    });
  });

  it("更新項目が無い場合は null", () => {
    expect(extractSectionPatch({})).toBeNull();
  });
});

describe("applySectionPatch", () => {
  it("visible と data を部分更新する", () => {
    const section = {
      type: "textBlock",
      id: "sec_text_001",
      visible: true,
      data: { title: "Old", body: "Keep" },
    };

    expect(
      applySectionPatch(section, {
        visible: false,
        dataPatch: { title: "New" },
      }),
    ).toEqual({
      type: "textBlock",
      id: "sec_text_001",
      visible: false,
      data: { title: "New", body: "Keep" },
    });
  });
});

describe("patchContentSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetContent.mockResolvedValue(sampleContent);
    mockedGetSchema.mockResolvedValue({
      id: "model-1",
      siteId: "site-1",
      name: "Page",
      apiName: "page",
      type: "single",
      schemaJson: pageSchemaJson,
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });
  });

  it("セクションを更新してコンテンツを返す", async () => {
    mockedUpdateContent.mockResolvedValue({
      ...sampleContent,
      dataJson: {
        sections: [
          {
            type: "textBlock",
            id: "sec_text_001",
            visible: false,
            data: { title: "Updated", body: "<p>Old body</p>" },
          },
        ],
      },
      updatedBy: "admin:site-1",
      updatedAt: "2026-05-29T01:00:00.000Z",
    });

    const result = await patchContentSection(
      "site-1",
      "page",
      "content-1",
      "sec_text_001",
      { title: "Updated", visible: false },
      "admin:site-1",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const sections = result.content.dataJson.sections as Array<{ visible: boolean; data: { title: string } }>;
      expect(sections[0].visible).toBe(false);
      expect(sections[0].data.title).toBe("Updated");
    }

    expect(mockedUpdateContent).toHaveBeenCalledWith(
      "site-1",
      "page",
      "content-1",
      expect.objectContaining({
        updatedBy: "admin:site-1",
        dataJson: expect.objectContaining({
          sections: [
            {
              type: "textBlock",
              id: "sec_text_001",
              visible: false,
              data: { title: "Updated", body: "<p>Old body</p>" },
            },
          ],
        }),
      }),
    );
  });

  it("コンテンツ未存在は content_not_found", async () => {
    mockedGetContent.mockResolvedValue(null);

    const result = await patchContentSection(
      "site-1",
      "page",
      "missing",
      "sec_text_001",
      { title: "X" },
      "admin:site-1",
    );

    expect(result).toEqual({ ok: false, error: "content_not_found", status: 404 });
  });

  it("セクション未存在は section_not_found", async () => {
    const result = await patchContentSection(
      "site-1",
      "page",
      "content-1",
      "missing",
      { title: "X" },
      "admin:site-1",
    );

    expect(result).toEqual({ ok: false, error: "section_not_found", status: 404 });
  });

  it("空パッチは empty_patch", async () => {
    const result = await patchContentSection(
      "site-1",
      "page",
      "content-1",
      "sec_text_001",
      {},
      "admin:site-1",
    );

    expect(result).toEqual({ ok: false, error: "empty_patch", status: 400 });
  });

  it("非オブジェクト body は invalid_body", async () => {
    const result = await patchContentSection(
      "site-1",
      "page",
      "content-1",
      "sec_text_001",
      null,
      "admin:site-1",
    );

    expect(result).toEqual({ ok: false, error: "invalid_body", status: 400 });
  });

  it("sectionArray 無しスキーマは no_section_field", async () => {
    mockedGetSchema.mockResolvedValue({
      id: "model-2",
      siteId: "site-1",
      name: "News",
      apiName: "news",
      type: "collection",
      schemaJson: {
        apiName: "news",
        label: "News",
        type: "collection",
        fields: [{ name: "body", label: "Body", type: "richText" }],
      },
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });

    const result = await patchContentSection(
      "site-1",
      "news",
      "content-1",
      "sec_text_001",
      { title: "X" },
      "admin:site-1",
    );

    expect(result).toEqual({ ok: false, error: "no_section_field", status: 400 });
  });
});
