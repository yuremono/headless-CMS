import {
  applySitePermission,
  validateAdminAccess,
  validateGlobalAdminAccess,
  type AdminAccessOptions,
  type AuthResult,
} from "@/lib/auth";
import { resolveActorSiteRole, resolveGlobalActorRole } from "@/lib/auth/site-role";
import {
  getAdminContent,
  listAdminContentTypes,
  listAdminContents as listAdminContentsForUi,
} from "@/lib/db/sites";
import { isPlainObject, parsePagination } from "@/lib/http";
import {
  createContent,
  deleteContent,
  duplicateContent,
  getContent,
  getSchema,
  listContents,
  listSchemas,
  publishContent,
  unpublishContent,
  updateContent,
} from "@/lib/content/store";
import type {
  ContentCollectionResult,
  ContentRecord,
  ContentStatus,
  CreateContentInput,
  UpdateContentInput,
} from "@/lib/content/types";

export type {
  AdminContentRecord,
  AdminContentTypeDefinition,
  ContentCollectionResult,
  ContentModelRecord,
  ContentRecord,
  ContentStatus,
  DashboardSnapshot,
  SiteSummary,
} from "@/lib/content/types";

export type { ResolveDeliveryRequestResult as ResolveRequestResult } from "./delivery";
export {
  getDeliveryContent,
  listDeliveryContents,
  resolveDeliveryRequest,
} from "./delivery";

const CONTROL_KEYS = new Set([
  "slug",
  "title",
  "status",
  "data",
  "dataJson",
  "data_json",
  "createdBy",
  "updatedBy",
  "publishedAt",
  "fieldFormats",
]);

function extractFieldFormats(
  body: Record<string, unknown>,
): Record<string, "plain" | "richText"> | undefined {
  const raw = body.fieldFormats;
  if (!isPlainObject(raw)) {
    return undefined;
  }

  const formats: Record<string, "plain" | "richText"> = {};
  for (const [path, value] of Object.entries(raw)) {
    if (value === "plain" || value === "richText") {
      formats[path] = value;
    }
  }
  return formats;
}

function normalizeContentStatus(value: unknown): ContentStatus | undefined {
  if (value === "draft" || value === "published" || value === "unpublished") {
    return value;
  }

  return undefined;
}

function extractDataJson(body: Record<string, unknown>): Record<string, unknown> {
  const explicitData = body.dataJson ?? body.data_json ?? body.data;
  if (isPlainObject(explicitData)) {
    return { ...explicitData };
  }

  const extracted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!CONTROL_KEYS.has(key)) {
      extracted[key] = value;
    }
  }

  return extracted;
}

function normalizeSlug(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return undefined;
}

function normalizeTitle(body: Record<string, unknown>, dataJson: Record<string, unknown>): string | null | undefined {
  if (typeof body.title === "string") {
    const trimmed = body.title.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof dataJson.title === "string") {
    const trimmed = dataJson.title.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return undefined;
}

export async function resolveAdminRequest(
  request: Request,
  siteId: string,
  options?: AdminAccessOptions,
): Promise<AuthResult> {
  const auth = await validateAdminAccess(request, siteId);
  if (!auth.ok) {
    return auth;
  }

  const siteRole = await resolveActorSiteRole(siteId, auth.context);
  return applySitePermission(auth, siteRole, options?.permission);
}

export async function resolveGlobalAdminRequest(
  request: Request,
  options?: AdminAccessOptions,
): Promise<AuthResult> {
  const auth = await validateGlobalAdminAccess(request);
  if (!auth.ok) {
    return auth;
  }

  const siteRole = await resolveGlobalActorRole(auth.context);
  return applySitePermission(auth, siteRole, options?.permission);
}

export async function getSchemas(siteId: string) {
  return listSchemas(siteId);
}

/**
 * フロント検証ツール向けのフィールドマニフェスト（定義済みパス + format）を返す。
 * id 指定時はそのコンテンツの実データ、未指定時は最新 1 件のデータからパスを収集する。
 */
export async function getFieldManifest(
  siteId: string,
  contentType: string,
  id?: string | null,
) {
  const { buildFieldManifest } = await import("./field-manifest");
  const schema = await getSchema(siteId, contentType);
  const schemaJson = (schema?.schemaJson ?? {}) as Record<string, unknown>;

  let dataJson: Record<string, unknown> = {};
  if (id) {
    const content = await getContent(siteId, contentType, id, true);
    dataJson = content?.dataJson ?? {};
  } else {
    const list = await listContents({ siteId, contentType, includeDraft: true, limit: 1, offset: 0 });
    dataJson = list.items[0]?.dataJson ?? {};
  }

  return buildFieldManifest(contentType, schemaJson, dataJson);
}

export async function getSchemaByType(siteId: string, contentType: string) {
  return getSchema(siteId, contentType);
}

export async function getAdminContentTypes(siteId: string) {
  return listAdminContentTypes(siteId);
}

export async function getAdminAssets(
  siteId: string,
  searchParams: URLSearchParams,
) {
  const { listAssets } = await import("@/lib/db/assets");
  const { resolveSiteId } = await import("@/lib/db/site-resolver");
  const { limit, offset } = parsePagination(searchParams);
  const resolvedSiteId = await resolveSiteId(siteId);

  if (!resolvedSiteId) {
    return null;
  }

  return listAssets(resolvedSiteId, { limit, offset });
}

export async function patchAdminAsset(
  siteId: string,
  assetId: string,
  body: Record<string, unknown>,
) {
  const { updateAsset } = await import("@/lib/db/assets");
  const { resolveSiteId } = await import("@/lib/db/site-resolver");
  const resolvedSiteId = await resolveSiteId(siteId);

  if (!resolvedSiteId) {
    return null;
  }

  const alt = typeof body.alt === "string" ? body.alt.trim() || null : body.alt === null ? null : undefined;

  if (alt === undefined) {
    return { error: "missing_alt", status: 400 as const };
  }

  const asset = await updateAsset({
    assetId,
    siteId: resolvedSiteId,
    alt,
  });

  if (!asset) {
    return { error: "not_found", status: 404 as const };
  }

  return { asset };
}

const MEMBER_MANAGE_PERMISSION = { permission: "member:manage" as const };

export async function getAdminMembers(siteId: string) {
  const { listSiteMembers } = await import("@/lib/db/members");
  return listSiteMembers(siteId);
}

export async function inviteAdminMember(siteId: string, body: Record<string, unknown>) {
  const { inviteSiteMember } = await import("@/lib/db/members");
  return inviteSiteMember(siteId, body);
}

export async function patchAdminMember(siteId: string, memberId: string, body: Record<string, unknown>) {
  const { updateSiteMemberRole } = await import("@/lib/db/members");
  return updateSiteMemberRole(siteId, memberId, body);
}

export async function deleteAdminMember(siteId: string, memberId: string) {
  const { removeSiteMember } = await import("@/lib/db/members");
  return removeSiteMember(siteId, memberId);
}

export { MEMBER_MANAGE_PERMISSION };

export async function listAdminContents(
  siteId: string,
  contentType: string,
  searchParams: URLSearchParams,
): Promise<ContentCollectionResult> {
  const { limit, offset } = parsePagination(searchParams);
  return listContents({
    siteId,
    contentType,
    includeDraft: true,
    limit,
    offset,
    slug: searchParams.get("slug"),
  });
}

export async function listAdminContentsUi(siteId: string, contentType: string) {
  return listAdminContentsForUi(siteId, contentType);
}

export async function getAdminContentRecord(siteId: string, contentType: string, id: string) {
  return getAdminContent(siteId, contentType, id);
}

export async function createAdminContent(
  siteId: string,
  contentType: string,
  body: unknown,
  userId: string | null,
): Promise<ContentRecord | null> {
  if (!isPlainObject(body)) {
    return null;
  }

  const dataJson = extractDataJson(body);
  const slug = normalizeSlug(body.slug);
  const title = normalizeTitle(body, dataJson);
  const status = normalizeContentStatus(body.status);

  return createContent(siteId, contentType, {
    slug,
    title,
    status,
    dataJson,
    createdBy: userId,
    updatedBy: userId,
    composableFieldFormats: extractFieldFormats(body),
  } satisfies CreateContentInput);
}

export async function updateAdminContent(
  siteId: string,
  contentType: string,
  id: string,
  body: unknown,
  userId: string | null,
): Promise<ContentRecord | null> {
  if (!isPlainObject(body)) {
    return null;
  }

  const dataJson = extractDataJson(body);
  const slug = normalizeSlug(body.slug);
  const title = normalizeTitle(body, dataJson);
  const status = normalizeContentStatus(body.status);

  return updateContent(siteId, contentType, id, {
    slug,
    title,
    status,
    dataJson,
    updatedBy: userId,
    composableFieldFormats: extractFieldFormats(body),
  } satisfies UpdateContentInput);
}

export async function removeAdminContent(siteId: string, contentType: string, id: string): Promise<boolean> {
  return deleteContent(siteId, contentType, id);
}

export async function publishAdminContent(
  siteId: string,
  contentType: string,
  id: string,
  userId: string | null,
): Promise<ContentRecord | null> {
  return publishContent(siteId, contentType, id, userId);
}

export async function unpublishAdminContent(
  siteId: string,
  contentType: string,
  id: string,
  userId: string | null,
): Promise<ContentRecord | null> {
  return unpublishContent(siteId, contentType, id, userId);
}

export async function duplicateAdminContent(
  siteId: string,
  contentType: string,
  id: string,
  userId: string | null,
): Promise<ContentRecord | null> {
  return duplicateContent(siteId, contentType, id, userId);
}

export { patchContentSection as patchAdminSection } from "@/lib/content/section-patch";
export type { PatchSectionResult } from "@/lib/content/section-patch";
