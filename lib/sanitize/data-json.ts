import {
  collectLeafPaths,
  matchKnownSuffix,
  parseWildcardFormatPath,
} from "@/lib/admin/field-type-catalog";
import { clonePlainObject, isPlainObject } from "@/lib/http";
import type {
  ContentFieldDefinition,
  ContentTypeDefinition,
  SectionArrayField,
} from "@/lib/schemas/content-field";
import { parseContentTypeDefinition } from "@/lib/schemas/content-type";
import { sanitizeRichTextHtml } from "./html";

async function sanitizeFieldValue(
  value: unknown,
  field: ContentFieldDefinition,
): Promise<unknown> {
  switch (field.type) {
    case "richText":
      return typeof value === "string" ? sanitizeRichTextHtml(value) : value;
    case "object":
      if (!isPlainObject(value)) {
        return value;
      }
      return sanitizeObjectFields(value, field.fields);
    case "array":
      if (!Array.isArray(value)) {
        return value;
      }
      return Promise.all(value.map((item) => sanitizeFieldValue(item, field.item)));
    case "sectionArray":
      if (!Array.isArray(value)) {
        return value;
      }
      return Promise.all(value.map((section) => sanitizeSectionValue(section, field)));
    default:
      return value;
  }
}

async function sanitizeSectionValue(
  section: unknown,
  field: SectionArrayField,
): Promise<unknown> {
  if (!isPlainObject(section)) {
    return section;
  }

  const sectionType = section.type;
  if (typeof sectionType !== "string") {
    return section;
  }

  const template = field.allowedSections.find((entry) => entry.type === sectionType);
  if (!template?.fields || template.fields.length === 0) {
    return section;
  }

  const data = section.data;
  if (!isPlainObject(data)) {
    return section;
  }

  return {
    ...section,
    data: await sanitizeObjectFields(data, template.fields),
  };
}

async function sanitizeObjectFields(
  data: Record<string, unknown>,
  fields: ContentFieldDefinition[],
): Promise<Record<string, unknown>> {
  const result = clonePlainObject(data);

  for (const field of fields) {
    if (!(field.name in result)) {
      continue;
    }

    result[field.name] = await sanitizeFieldValue(result[field.name], field);
  }

  return result;
}

function parseSchemaDefinition(schemaJson: Record<string, unknown>): ContentTypeDefinition | null {
  try {
    return parseContentTypeDefinition(schemaJson);
  } catch {
    return null;
  }
}

function isComposableRichTextFormat(value: unknown): value is "richText" {
  return value === "richText";
}

/** ドット記法パスへ値を設定する（経路上のオブジェクトが無ければ生成しない＝既存値のみ更新）。 */
function setExistingPathValue(
  data: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current: Record<string, unknown> | unknown[] = data;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index] ?? "";

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(part, 10);
      if (!Number.isFinite(arrayIndex) || arrayIndex < 0 || arrayIndex >= current.length) {
        return;
      }
      const next = current[arrayIndex];
      if (next === null || typeof next !== "object") {
        return;
      }
      current = next as Record<string, unknown> | unknown[];
      continue;
    }

    const next = current[part];
    if (next === null || typeof next !== "object") {
      return;
    }
    current = next as Record<string, unknown> | unknown[];
  }

  const leaf = parts[parts.length - 1] ?? "";
  if (Array.isArray(current)) {
    const arrayIndex = Number.parseInt(leaf, 10);
    if (Number.isFinite(arrayIndex) && arrayIndex >= 0 && arrayIndex < current.length) {
      current[arrayIndex] = value;
    }
    return;
  }

  if (leaf in current) {
    current[leaf] = value;
  }
}

function readPathValue(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(part, 10);
      if (!Number.isFinite(arrayIndex) || arrayIndex < 0 || arrayIndex >= current.length) {
        return undefined;
      }
      current = current[arrayIndex];
      continue;
    }

    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * composable フィールドビルダーで richText 指定されたパスをサニタイズする。
 * これらは content-type スキーマの fields に含まれないため、スキーマ駆動サニタイズの対象外。
 * schema_json.composableFieldFormats（jsonPath -> format）を見て個別にサニタイズする。
 */
async function sanitizeComposableRichText(
  dataJson: Record<string, unknown>,
  schemaJson: Record<string, unknown>,
): Promise<void> {
  const formats = schemaJson.composableFieldFormats;
  if (!isPlainObject(formats)) {
    return;
  }

  for (const [path, format] of Object.entries(formats)) {
    if (!isComposableRichTextFormat(format)) {
      continue;
    }

    const wildcard = parseWildcardFormatPath(path);
    if (wildcard) {
      for (const leafPath of collectLeafPaths(dataJson)) {
        const matched = matchKnownSuffix(leafPath);
        if (
          !matched ||
          matched.prefix !== wildcard.fieldPrefix ||
          matched.arrayIndex === undefined ||
          matched.suffix !== wildcard.suffix
        ) {
          continue;
        }
        const value = readPathValue(dataJson, leafPath);
        if (typeof value === "string") {
          setExistingPathValue(dataJson, leafPath, await sanitizeRichTextHtml(value));
        }
      }
      continue;
    }

    const value = readPathValue(dataJson, path);
    if (typeof value === "string") {
      setExistingPathValue(dataJson, path, await sanitizeRichTextHtml(value));
    }
  }
}

export async function sanitizeContentDataJson(
  dataJson: Record<string, unknown>,
  schemaJson: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const definition = parseSchemaDefinition(schemaJson);

  const result = definition
    ? await sanitizeObjectFields(dataJson, definition.fields)
    : clonePlainObject(dataJson);

  await sanitizeComposableRichText(result, schemaJson);

  return result;
}
