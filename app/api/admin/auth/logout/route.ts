import { errorResponse, jsonResponse } from "@/app/api/_lib/http";
import { revokeAppSession } from "@/lib/auth/app-session";
import { getAuthProvider } from "@/lib/auth/production-config";

function readSessionToken(request: Request): string | null {
  const header = request.headers.get("x-session-token")?.trim();
  if (header) {
    return header;
  }

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("cms_session="))
    ?.slice("cms_session=".length);

  return cookie ? decodeURIComponent(cookie) : null;
}

export async function POST(request: Request): Promise<Response> {
  if (getAuthProvider() !== "authjs") {
    return errorResponse(400, "auth_not_configured", "Auth.js logout is not enabled.");
  }

  const token = readSessionToken(request);
  if (token) {
    await revokeAppSession(token);
  }

  return jsonResponse({ ok: true });
}
