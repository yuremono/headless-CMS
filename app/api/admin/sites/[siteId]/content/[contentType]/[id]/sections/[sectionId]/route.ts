import { resolveContentUserId } from "@/lib/auth/content-user";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import { patchAdminSection, resolveAdminRequest } from "@/lib/content/service";
import { recordAuditFromContext } from "@/lib/audit/log";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ siteId: string; contentType: string; id: string; sectionId: string }>;
  },
): Promise<Response> {
  const { siteId, contentType, id, sectionId } = await params;
  const resolved = await resolveAdminRequest(request, siteId, { permission: "content:write" });

  if (!resolved.ok) {
    return errorResponse(resolved.failure.status, resolved.failure.code, resolved.failure.error);
  }

  const body = await readJsonBody(request);
  const result = await patchAdminSection(
    siteId,
    contentType,
    id,
    sectionId,
    body,
    resolveContentUserId(resolved.context),
  );

  if (!result.ok) {
    const message =
      result.error === "section_not_found"
        ? "Section not found."
        : result.error === "no_section_field"
          ? "Content type has no section array field."
          : result.error === "empty_patch"
            ? "Request body must include section fields to update."
            : result.error === "invalid_body"
              ? "Request body must be a JSON object."
              : "Content not found.";

    return errorResponse(result.status, result.error, message);
  }

  await recordAuditFromContext(resolved.context, siteId, "content.section.update", "content", id, {
    contentType,
    sectionId,
    title: result.content.title,
  });

  return jsonResponse(result.content);
}
