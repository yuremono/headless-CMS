import { clonePlainObject, isPlainObject } from "@/lib/http";
import type {
  ContentFieldDefinition,
  ContentTypeDefinition,
  SectionArrayField,
} from "@/lib/schemas/content-field";
import { parseContentTypeDefinition } from "@/lib/schemas/content-type";
import { sanitizeRichTextHtml } from "./html";

function sanitizeFieldValue(value: unknown, field: ContentFieldDefinition): unknown {
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
      return value.map((item) => sanitizeFieldValue(item, field.item));
    case "sectionArray":
      if (!Array.isArray(value)) {
        return value;
      }
      return value.map((section) => sanitizeSectionValue(section, field));
    default:
      return value;
  }
}

function sanitizeSectionValue(section: unknown, field: SectionArrayField): unknown {
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
    data: sanitizeObjectFields(data, template.fields),
  };
}

function sanitizeObjectFields(
  data: Record<string, unknown>,
  fields: ContentFieldDefinition[],
): Record<string, unknown> {
  const result = clonePlainObject(data);

  for (const field of fields) {
    if (!(field.name in result)) {
      continue;
    }

    result[field.name] = sanitizeFieldValue(result[field.name], field);
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

export function sanitizeContentDataJson(
  dataJson: Record<string, unknown>,
  schemaJson: Record<string, unknown>,
): Record<string, unknown> {
  const definition = parseSchemaDefinition(schemaJson);
  if (!definition) {
    return dataJson;
  }

  return sanitizeObjectFields(dataJson, definition.fields);
}
