import type { Content, ContentModel, User } from "@prisma/client";
import { clonePlainObject, isPlainObject } from "@/lib/http";
import type {
  AdminContentRecord,
  AdminContentTypeDefinition,
  ContentModelRecord,
  ContentRecord,
  ContentStatus,
} from "./types";

function toIsoString(value: Date): string {
  return value.toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? clonePlainObject(value) : {};
}

function normalizeStatus(status: string): ContentStatus {
  if (status === "published" || status === "unpublished") {
    return status;
  }

  return "draft";
}

function extractSummary(dataJson: Record<string, unknown>): string {
  if (typeof dataJson.summary === "string" && dataJson.summary.trim()) {
    return dataJson.summary;
  }

  const seo = dataJson.seo;
  if (isPlainObject(seo) && typeof seo.description === "string" && seo.description.trim()) {
    return seo.description;
  }

  const hero = dataJson.hero;
  if (isPlainObject(hero) && typeof hero.lead === "string" && hero.lead.trim()) {
    return hero.lead;
  }

  return "";
}

export function toContentModelRecord(model: ContentModel): ContentModelRecord {
  return {
    id: model.id,
    siteId: model.siteId,
    name: model.name,
    apiName: model.apiName,
    type: model.type,
    schemaJson: asRecord(model.schemaJson),
    createdAt: toIsoString(model.createdAt),
    updatedAt: toIsoString(model.updatedAt),
  };
}

export function toContentRecord(content: Content, contentType: string): ContentRecord {
  return {
    id: content.id,
    siteId: content.siteId,
    contentType,
    slug: content.slug,
    title: content.title,
    status: normalizeStatus(content.status),
    dataJson: asRecord(content.dataJson),
    createdBy: content.createdBy,
    updatedBy: content.updatedBy,
    publishedAt: content.publishedAt ? toIsoString(content.publishedAt) : null,
    createdAt: toIsoString(content.createdAt),
    updatedAt: toIsoString(content.updatedAt),
  };
}

export function toAdminContentRecord(
  content: Content,
  contentType: string,
  creator?: User | null,
): AdminContentRecord {
  const dataJson = asRecord(content.dataJson);

  return {
    id: content.id,
    contentType,
    siteId: content.siteId,
    title: content.title,
    slug: content.slug ?? "",
    status: normalizeStatus(content.status),
    updatedAt: toIsoString(content.updatedAt),
    author: creator?.name ?? creator?.email ?? "Admin",
    summary: extractSummary(dataJson),
    data: dataJson,
  };
}

export function toAdminContentTypeDefinition(model: ContentModel): AdminContentTypeDefinition {
  const schemaJson = asRecord(model.schemaJson);

  return {
    slug: model.apiName,
    label: model.name,
    kind: model.type,
    description:
      typeof schemaJson.description === "string" && schemaJson.description.trim()
        ? schemaJson.description
        : model.name,
    schemaJson,
  };
}
