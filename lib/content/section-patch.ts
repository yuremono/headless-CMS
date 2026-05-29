import { getContent, getSchema, updateContent } from "@/lib/content/store";
import { clonePlainObject, isPlainObject } from "@/lib/http";
import { parseContentTypeDefinition } from "@/lib/schemas/content-type";
import type { ContentRecord } from "./types";

export interface SectionPatchInput {
  visible?: boolean;
  dataPatch: Record<string, unknown>;
}

export type PatchSectionErrorCode =
  | "content_not_found"
  | "section_not_found"
  | "no_section_field"
  | "invalid_body"
  | "empty_patch";

export type PatchSectionResult =
  | { ok: true; content: ContentRecord }
  | { ok: false; error: PatchSectionErrorCode; status: 400 | 404 };

const SECTION_PATCH_CONTROL_KEYS = new Set(["type", "id", "visible", "data"]);

export function findSectionArrayFieldNames(schemaJson: Record<string, unknown>): string[] {
  try {
    const definition = parseContentTypeDefinition(schemaJson);
    return definition.fields.filter((field) => field.type === "sectionArray").map((field) => field.name);
  } catch {
    return [];
  }
}

export function findSectionLocation(
  dataJson: Record<string, unknown>,
  fieldNames: string[],
  sectionId: string,
): { fieldName: string; index: number } | null {
  for (const fieldName of fieldNames) {
    const sections = dataJson[fieldName];
    if (!Array.isArray(sections)) {
      continue;
    }

    const index = sections.findIndex(
      (section) => isPlainObject(section) && section.id === sectionId,
    );

    if (index >= 0) {
      return { fieldName, index };
    }
  }

  return null;
}

export function extractSectionPatch(body: Record<string, unknown>): SectionPatchInput | null {
  const dataPatch: Record<string, unknown> = {};

  if (isPlainObject(body.data)) {
    Object.assign(dataPatch, body.data);
  }

  for (const [key, value] of Object.entries(body)) {
    if (!SECTION_PATCH_CONTROL_KEYS.has(key)) {
      dataPatch[key] = value;
    }
  }

  const visible = typeof body.visible === "boolean" ? body.visible : undefined;
  const hasData = Object.keys(dataPatch).length > 0;

  if (visible === undefined && !hasData) {
    return null;
  }

  return {
    visible,
    dataPatch,
  };
}

export function applySectionPatch(
  section: Record<string, unknown>,
  patch: SectionPatchInput,
): Record<string, unknown> {
  const next = { ...section };
  const currentData = isPlainObject(section.data) ? section.data : {};

  if (patch.visible !== undefined) {
    next.visible = patch.visible;
  }

  if (Object.keys(patch.dataPatch).length > 0) {
    next.data = { ...currentData, ...patch.dataPatch };
  }

  return next;
}

export async function patchContentSection(
  siteId: string,
  contentType: string,
  contentId: string,
  sectionId: string,
  body: unknown,
  actorId: string,
): Promise<PatchSectionResult> {
  if (!isPlainObject(body)) {
    return { ok: false, error: "invalid_body", status: 400 };
  }

  const patch = extractSectionPatch(body);
  if (!patch) {
    return { ok: false, error: "empty_patch", status: 400 };
  }

  const current = await getContent(siteId, contentType, contentId, true);
  if (!current) {
    return { ok: false, error: "content_not_found", status: 404 };
  }

  const schema = await getSchema(siteId, contentType);
  if (!schema) {
    return { ok: false, error: "content_not_found", status: 404 };
  }

  const fieldNames = findSectionArrayFieldNames(schema.schemaJson);
  if (fieldNames.length === 0) {
    return { ok: false, error: "no_section_field", status: 400 };
  }

  const location = findSectionLocation(current.dataJson, fieldNames, sectionId);
  if (!location) {
    return { ok: false, error: "section_not_found", status: 404 };
  }

  const sections = current.dataJson[location.fieldName];
  if (!Array.isArray(sections)) {
    return { ok: false, error: "section_not_found", status: 404 };
  }

  const currentSection = sections[location.index];
  if (!isPlainObject(currentSection)) {
    return { ok: false, error: "section_not_found", status: 404 };
  }

  const nextSections = sections.map((section, index) => {
    if (index !== location.index || !isPlainObject(section)) {
      return section;
    }

    return applySectionPatch(section, patch);
  });

  const nextDataJson = clonePlainObject(current.dataJson);
  nextDataJson[location.fieldName] = nextSections;

  const content = await updateContent(siteId, contentType, contentId, {
    dataJson: nextDataJson,
    updatedBy: actorId,
  });

  if (!content) {
    return { ok: false, error: "content_not_found", status: 404 };
  }

  return { ok: true, content };
}
