import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveSiteId } from "@/lib/db/site-resolver";
import { revalidateDeliveryContent } from "@/lib/content/delivery-tags";
import { clonePlainObject, isPlainObject } from "@/lib/http";
import { toContentModelRecord, toContentRecord } from "./mappers";
import type {
  ComposableFieldDirectories,
  ComposableFieldDefinitions,
  ComposableFieldFormatMap,
  ContentCollectionResult,
  ContentModelRecord,
  ContentRecord,
  ContentStatus,
  CreateContentInput,
  ListContentsInput,
  UpdateContentInput,
} from "./types";

async function sanitizeDataJson(
  dataJson: Record<string, unknown>,
  schemaJson: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { sanitizeContentDataJson } = await import("@/lib/sanitize");
  return await sanitizeContentDataJson(dataJson, schemaJson);
}

// 公開保存・更新・削除のたびに配信キャッシュを即時失効させ、フロントへほぼ即時に反映する。
async function revalidateDeliveryFor(
  siteIdOrSlug: string,
  contentType: string,
  ref: { id: string; slug: string | null },
): Promise<void> {
  await revalidateDeliveryContent(siteIdOrSlug, contentType, { id: ref.id, slug: ref.slug });
}

function normalizeStatus(status: unknown): ContentStatus {
  if (status === "published" || status === "unpublished") {
    return status;
  }

  return "draft";
}

async function getContentModel(siteId: string, contentType: string) {
  return prisma.contentModel.findUnique({
    where: {
      siteId_apiName: {
        siteId,
        apiName: contentType,
      },
    },
  });
}

/**
 * composable 編集 UI の管理メタデータを schema_json へマージする。
 * fieldFormats 指定時は現在のフォーム状態を正として richText のみ保存する。
 * 変更があれば DB を更新し、いずれにせよ最新の schema_json を返す（サニタイズに使う）。
 */
async function applyComposableMetadata(
  modelId: string,
  schemaJson: Record<string, unknown>,
  incoming: {
    fieldFormats?: ComposableFieldFormatMap;
    fieldDirectories?: ComposableFieldDirectories;
    fieldDefinitions?: ComposableFieldDefinitions;
  },
): Promise<Record<string, unknown>> {
  if (!incoming.fieldFormats && !incoming.fieldDirectories && !incoming.fieldDefinitions) {
    return schemaJson;
  }

  const hasExistingFormats = isPlainObject(schemaJson.composableFieldFormats);
  const existingRaw = hasExistingFormats ? (schemaJson.composableFieldFormats as Record<string, unknown>) : {};
  const next: Record<string, "richText"> = {};

  if (!incoming.fieldFormats) {
    for (const [path, format] of Object.entries(existingRaw)) {
      if (format === "richText") {
        next[path] = "richText";
      }
    }
  }
  if (incoming.fieldFormats) {
    for (const [path, format] of Object.entries(incoming.fieldFormats)) {
      if (format === "richText") {
        next[path] = "richText";
      } else {
        delete next[path];
      }
    }
  }

  const merged = { ...schemaJson };
  if (incoming.fieldFormats) {
    merged.composableFieldFormats = next;
  } else if (hasExistingFormats) {
    merged.composableFieldFormats = schemaJson.composableFieldFormats;
  }
  if (incoming.fieldDirectories) {
    merged.composableFieldDirectories = incoming.fieldDirectories;
  }
  if (incoming.fieldDefinitions) {
    merged.composableFieldDefinitions = incoming.fieldDefinitions;
  }

  const existingDirectories = schemaJson.composableFieldDirectories;
  const existingDefinitions = schemaJson.composableFieldDefinitions;
  const changed =
    (incoming.fieldFormats !== undefined && JSON.stringify(existingRaw) !== JSON.stringify(next)) ||
    (incoming.fieldDirectories !== undefined &&
      JSON.stringify(existingDirectories) !== JSON.stringify(incoming.fieldDirectories)) ||
    (incoming.fieldDefinitions !== undefined &&
      JSON.stringify(existingDefinitions) !== JSON.stringify(incoming.fieldDefinitions));
  if (changed) {
    await prisma.contentModel.update({
      where: { id: modelId },
      data: { schemaJson: merged as Prisma.InputJsonValue },
    });
  }

  return merged;
}

export async function listSchemas(siteIdOrSlug: string): Promise<ContentModelRecord[]> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return [];
  }

  const models = await prisma.contentModel.findMany({
    where: { siteId },
    orderBy: { apiName: "asc" },
  });

  return models.map(toContentModelRecord);
}

export async function upsertSchema(
  siteIdOrSlug: string,
  schema: Omit<ContentModelRecord, "id" | "siteId" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ContentModelRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await prisma.contentModel.upsert({
    where: {
      siteId_apiName: {
        siteId,
        apiName: schema.apiName,
      },
    },
    update: {
      name: schema.name,
      type: schema.type,
      schemaJson: schema.schemaJson as Prisma.InputJsonValue,
    },
    create: {
      id: schema.id,
      siteId,
      name: schema.name,
      apiName: schema.apiName,
      type: schema.type,
      schemaJson: schema.schemaJson as Prisma.InputJsonValue,
    },
  });

  return toContentModelRecord(model);
}

export async function getSchema(siteIdOrSlug: string, contentType: string): Promise<ContentModelRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await getContentModel(siteId, contentType);
  return model ? toContentModelRecord(model) : null;
}

export async function listContents(input: ListContentsInput): Promise<ContentCollectionResult> {
  const siteId = await resolveSiteId(input.siteId);
  if (!siteId) {
    return { items: [], total: 0, limit: input.limit, offset: input.offset };
  }

  const model = await getContentModel(siteId, input.contentType);
  if (!model) {
    return { items: [], total: 0, limit: input.limit, offset: input.offset };
  }

  const where: Prisma.ContentWhereInput = {
    siteId,
    modelId: model.id,
  };

  if (!input.includeDraft) {
    where.status = "published";
  }

  if (input.slug !== undefined && input.slug !== null && input.slug !== "") {
    where.slug = input.slug;
  }

  const [rows, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: input.offset,
      take: input.limit,
    }),
    prisma.content.count({ where }),
  ]);

  return {
    items: rows.map((row) => toContentRecord(row, input.contentType)),
    total,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function getContent(
  siteIdOrSlug: string,
  contentType: string,
  idOrSlug: string,
  includeDraft: boolean,
): Promise<ContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await getContentModel(siteId, contentType);
  if (!model) {
    return null;
  }

  const row = await prisma.content.findFirst({
    where: {
      siteId,
      modelId: model.id,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });

  if (!row) {
    return null;
  }

  if (!includeDraft && row.status !== "published") {
    return null;
  }

  return toContentRecord(row, contentType);
}

export async function createContent(
  siteIdOrSlug: string,
  contentType: string,
  input: CreateContentInput,
): Promise<ContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await getContentModel(siteId, contentType);
  if (!model) {
    return null;
  }

  const status = normalizeStatus(input.status);
  const schemaJson = await applyComposableMetadata(
    model.id,
    asRecord(model.schemaJson),
    {
      fieldFormats: input.composableFieldFormats,
      fieldDirectories: input.composableFieldDirectories,
      fieldDefinitions: input.composableFieldDefinitions,
    },
  );
  const dataJson = await sanitizeDataJson(
    input.dataJson ? clonePlainObject(input.dataJson) : {},
    schemaJson,
  );
  const title =
    input.title ??
    (typeof dataJson.title === "string" && dataJson.title.trim() ? dataJson.title : "Untitled");

  const row = await prisma.content.create({
    data: {
      siteId,
      modelId: model.id,
      slug: input.slug ?? null,
      title,
      status,
      dataJson: dataJson as Prisma.InputJsonValue,
      createdBy: input.createdBy ?? null,
      updatedBy: input.updatedBy ?? input.createdBy ?? null,
      publishedAt: status === "published" ? new Date() : null,
    },
  });

  const record = toContentRecord(row, contentType);
  await revalidateDeliveryFor(siteIdOrSlug, contentType, record);
  return record;
}

export async function updateContent(
  siteIdOrSlug: string,
  contentType: string,
  id: string,
  input: UpdateContentInput,
): Promise<ContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await getContentModel(siteId, contentType);
  if (!model) {
    return null;
  }

  const current = await prisma.content.findFirst({
    where: {
      id,
      siteId,
      modelId: model.id,
    },
  });

  if (!current) {
    return null;
  }

  const schemaJson = await applyComposableMetadata(
    model.id,
    asRecord(model.schemaJson),
    {
      fieldFormats: input.composableFieldFormats,
      fieldDirectories: input.composableFieldDirectories,
      fieldDefinitions: input.composableFieldDefinitions,
    },
  );
  const dataJson = await sanitizeDataJson(
    input.dataJson ? clonePlainObject(input.dataJson) : asRecord(current.dataJson),
    schemaJson,
  );
  const nextStatus = input.status ?? normalizeStatus(current.status);
  const title =
    input.title ??
    current.title ??
    (typeof dataJson.title === "string" && dataJson.title.trim() ? dataJson.title : current.title);

  const row = await prisma.content.update({
    where: { id: current.id },
    data: {
      slug: input.slug === undefined ? current.slug : input.slug,
      title,
      status: nextStatus,
      dataJson: dataJson as Prisma.InputJsonValue,
      updatedBy: input.updatedBy ?? current.updatedBy,
      publishedAt:
        nextStatus === "published"
          ? current.publishedAt ?? new Date()
          : nextStatus === "draft"
            ? null
            : current.publishedAt,
    },
  });

  const record = toContentRecord(row, contentType);
  await revalidateDeliveryFor(siteIdOrSlug, contentType, record);
  return record;
}

export async function deleteContent(siteIdOrSlug: string, contentType: string, id: string): Promise<boolean> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return false;
  }

  const model = await getContentModel(siteId, contentType);
  if (!model) {
    return false;
  }

  const target = await prisma.content.findFirst({
    where: { id, siteId, modelId: model.id },
    select: { id: true, slug: true },
  });

  const result = await prisma.content.deleteMany({
    where: {
      id,
      siteId,
      modelId: model.id,
    },
  });

  if (result.count > 0) {
    await revalidateDeliveryFor(siteIdOrSlug, contentType, {
      id: target?.id ?? id,
      slug: target?.slug ?? null,
    });
  }

  return result.count > 0;
}

export async function publishContent(
  siteIdOrSlug: string,
  contentType: string,
  id: string,
  updatedBy?: string | null,
): Promise<ContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await getContentModel(siteId, contentType);
  if (!model) {
    return null;
  }

  const current = await prisma.content.findFirst({
    where: {
      id,
      siteId,
      modelId: model.id,
    },
  });

  if (!current) {
    return null;
  }

  const row = await prisma.content.update({
    where: { id: current.id },
    data: {
      status: "published",
      updatedBy: updatedBy ?? current.updatedBy,
      publishedAt: new Date(),
    },
  });

  const record = toContentRecord(row, contentType);
  await revalidateDeliveryFor(siteIdOrSlug, contentType, record);
  return record;
}

export async function unpublishContent(
  siteIdOrSlug: string,
  contentType: string,
  id: string,
  updatedBy?: string | null,
): Promise<ContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await getContentModel(siteId, contentType);
  if (!model) {
    return null;
  }

  const current = await prisma.content.findFirst({
    where: {
      id,
      siteId,
      modelId: model.id,
    },
  });

  if (!current) {
    return null;
  }

  const row = await prisma.content.update({
    where: { id: current.id },
    data: {
      status: "unpublished",
      updatedBy: updatedBy ?? current.updatedBy,
    },
  });

  const record = toContentRecord(row, contentType);
  await revalidateDeliveryFor(siteIdOrSlug, contentType, record);
  return record;
}

function buildDuplicateSlug(slug: string | null): string | null {
  if (!slug || slug.trim().length === 0) {
    return null;
  }

  const suffix = Date.now().toString(36);
  const base = slug.replace(/-copy(?:-[a-z0-9]+)?$/i, "");
  return `${base}-copy-${suffix}`;
}

function buildDuplicateTitle(title: string | null): string {
  const base = title?.trim() || "Untitled";
  return `${base} (コピー)`;
}

export async function duplicateContent(
  siteIdOrSlug: string,
  contentType: string,
  id: string,
  actorId?: string | null,
): Promise<ContentRecord | null> {
  const siteId = await resolveSiteId(siteIdOrSlug);
  if (!siteId) {
    return null;
  }

  const model = await getContentModel(siteId, contentType);
  if (!model) {
    return null;
  }

  const current = await prisma.content.findFirst({
    where: {
      id,
      siteId,
      modelId: model.id,
    },
  });

  if (!current) {
    return null;
  }

  const dataJson = clonePlainObject(asRecord(current.dataJson));

  const row = await prisma.content.create({
    data: {
      siteId,
      modelId: model.id,
      slug: buildDuplicateSlug(current.slug),
      title: buildDuplicateTitle(current.title),
      status: "draft",
      dataJson: dataJson as Prisma.InputJsonValue,
      createdBy: actorId ?? current.createdBy,
      updatedBy: actorId ?? current.updatedBy,
      publishedAt: null,
    },
  });

  return toContentRecord(row, contentType);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? clonePlainObject(value) : {};
}

export async function seedSchema(
  siteIdOrSlug: string,
  schema: Omit<ContentModelRecord, "id" | "siteId" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ContentModelRecord | null> {
  return upsertSchema(siteIdOrSlug, schema);
}
