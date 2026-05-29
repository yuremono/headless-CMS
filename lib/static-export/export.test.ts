import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentRecord } from "@/lib/content/types";

vi.mock("@/lib/db/site-resolver", () => ({
  resolveSite: vi.fn(),
}));

vi.mock("@/lib/content/store", () => ({
  listSchemas: vi.fn(),
  listContents: vi.fn(),
}));

import { listContents, listSchemas } from "@/lib/content/store";
import { resolveSite } from "@/lib/db/site-resolver";
import { exportContent, exportSiteContent } from "./export";
import { getContentExportPathForRecord } from "./paths";

const mockedResolveSite = vi.mocked(resolveSite);
const mockedListSchemas = vi.mocked(listSchemas);
const mockedListContents = vi.mocked(listContents);

function makeContent(overrides: Partial<ContentRecord> = {}): ContentRecord {
  return {
    id: "content-1",
    siteId: "site-1",
    contentType: "news",
    slug: "hello-world",
    title: "Hello",
    status: "published",
    dataJson: {
      sections: [{ type: "textBlock", id: "t1", data: { title: "News", body: "Body" } }],
    },
    createdBy: null,
    updatedBy: null,
    publishedAt: "2026-05-29T00:00:00.000Z",
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  };
}

describe("static-export export", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "static-export-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("writes draft and published HTML under generated/{variant}/{contentType}/", async () => {
    const content = makeContent();
    const result = await exportContent(content, "main-site", tempDir);

    const draftPath = getContentExportPathForRecord(content, "draft", tempDir);
    const publishedPath = getContentExportPathForRecord(content, "published", tempDir);
    expect(result.paths).toEqual([draftPath, publishedPath]);

    const draftHtml = await fs.readFile(draftPath, "utf8");
    const publishedHtml = await fs.readFile(publishedPath, "utf8");
    expect(draftHtml).toContain("<!DOCTYPE html>");
    expect(draftHtml).toContain("News");
    expect(publishedHtml).toContain("News");
    expect(draftHtml).toContain("../../../css/preview.css");
  });

  it("removes published HTML on unpublish while keeping draft", async () => {
    const content = makeContent();
    await exportContent(content, "main-site", tempDir);

    const unpublished = makeContent({ status: "unpublished" });
    const result = await exportContent(unpublished, "main-site", tempDir);

    const draftPath = getContentExportPathForRecord(unpublished, "draft", tempDir);
    const publishedPath = getContentExportPathForRecord(unpublished, "published", tempDir);
    expect(result.paths).toEqual([draftPath]);
    await expect(fs.access(draftPath)).resolves.toBeUndefined();
    await expect(fs.access(publishedPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("exportSiteContent batches listContents and exports all items", async () => {
    mockedResolveSite.mockResolvedValue({
      id: "site-1",
      slug: "main-site",
      name: "Main",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedListSchemas.mockResolvedValue([
      {
        id: "model-1",
        siteId: "site-1",
        name: "News",
        apiName: "news",
        type: "collection",
        schemaJson: {},
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
      },
    ]);
    mockedListContents.mockResolvedValue({
      items: [makeContent(), makeContent({ id: "content-2", slug: "second", status: "draft" })],
      total: 2,
      limit: 100,
      offset: 0,
    });

    const result = await exportSiteContent("main-site", { includeDraft: true, generatedRoot: tempDir });

    expect(result.exported).toBe(3);
    expect(result.siteSlug).toBe("main-site");
    expect(result.paths).toHaveLength(3);
  });
});
