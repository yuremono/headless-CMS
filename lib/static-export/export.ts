import fs from "node:fs/promises";
import path from "node:path";
import { listContents, listSchemas } from "@/lib/content/store";
import type { ContentRecord } from "@/lib/content/types";
import { resolveSite } from "@/lib/db/site-resolver";
import { getContentExportPathForRecord } from "./paths";
import { renderContentPage } from "./render-page";

const EXPORT_PAGE_SIZE = 100;

export interface ExportContentResult {
  paths: string[];
  siteSlug: string;
}

export interface ExportSiteContentOptions {
  contentType?: string;
  /** true: draft を含む（既定）。false: published のみ */
  includeDraft?: boolean;
  generatedRoot?: string;
}

export interface ExportSiteContentResult {
  exported: number;
  paths: string[];
  siteSlug: string;
}

export async function removePublishedExport(
  content: ContentRecord,
  generatedRoot?: string,
): Promise<void> {
  const publishedPath = getContentExportPathForRecord(content, "published", generatedRoot);
  await fs.unlink(publishedPath).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  });
}

export async function exportContent(
  content: ContentRecord,
  siteSlug: string,
  generatedRoot?: string,
): Promise<ExportContentResult> {
  const paths: string[] = [];
  const draftPath = getContentExportPathForRecord(content, "draft", generatedRoot);
  const html = renderContentPage(content, { siteSlug });

  await fs.mkdir(path.dirname(draftPath), { recursive: true });
  await fs.writeFile(draftPath, html, "utf8");
  paths.push(draftPath);

  if (content.status === "published") {
    const publishedPath = getContentExportPathForRecord(content, "published", generatedRoot);
    await fs.mkdir(path.dirname(publishedPath), { recursive: true });
    await fs.writeFile(publishedPath, html, "utf8");
    paths.push(publishedPath);
  } else {
    await removePublishedExport(content, generatedRoot);
  }

  return { paths, siteSlug };
}

export async function exportSiteContent(
  siteIdOrSlug: string,
  options: ExportSiteContentOptions = {},
): Promise<ExportSiteContentResult> {
  const site = await resolveSite(siteIdOrSlug);
  if (!site) {
    return { exported: 0, paths: [], siteSlug: siteIdOrSlug };
  }

  const includeDraft = options.includeDraft !== false;
  const schemas = await listSchemas(site.id);
  const contentTypes = options.contentType
    ? schemas.filter((schema) => schema.apiName === options.contentType).map((s) => s.apiName)
    : schemas.map((schema) => schema.apiName);

  const paths: string[] = [];

  for (const contentType of contentTypes) {
    let offset = 0;

    while (true) {
      const batch = await listContents({
        siteId: site.id,
        contentType,
        includeDraft: true,
        limit: EXPORT_PAGE_SIZE,
        offset,
      });

      for (const item of batch.items) {
        if (!includeDraft && item.status !== "published") {
          continue;
        }

        const result = await exportContent(item, site.slug, options.generatedRoot);
        paths.push(...result.paths);
      }

      offset += EXPORT_PAGE_SIZE;
      if (offset >= batch.total) {
        break;
      }
    }
  }

  return { exported: paths.length, paths, siteSlug: site.slug };
}
