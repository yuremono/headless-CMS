import path from "node:path";
import type { ContentRecord } from "@/lib/content/types";

export const PREVIEW_ROOT = path.join(process.cwd(), "examples", "preview");
export const GENERATED_ROOT = path.join(PREVIEW_ROOT, "generated");

export type ExportVariant = "draft" | "published";

export const DRAFT_VARIANT: ExportVariant = "draft";
export const PUBLISHED_VARIANT: ExportVariant = "published";

/** generated/{variant}/{contentType}/ から preview.css への相対パス */
export const DEFAULT_CSS_HREF = "../../../css/preview.css";

export function contentFileBase(content: ContentRecord): string {
  const slug = content.slug?.trim();
  const raw = slug && slug.length > 0 ? slug : content.id;
  return raw.replace(/[/\\]/g, "_").replace(/\.\./g, "_");
}

export function getContentExportPath(
  variant: ExportVariant,
  contentType: string,
  fileBase: string,
  generatedRoot = GENERATED_ROOT,
): string {
  return path.join(generatedRoot, variant, contentType, `${fileBase}.html`);
}

export function getContentExportPathForRecord(
  content: ContentRecord,
  variant: ExportVariant,
  generatedRoot = GENERATED_ROOT,
): string {
  return getContentExportPath(variant, content.contentType, contentFileBase(content), generatedRoot);
}
