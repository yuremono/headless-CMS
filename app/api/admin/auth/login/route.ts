import { errorResponse, jsonResponse, readJsonBody } from "@/app/api/_lib/http";
import { createAppSession } from "@/lib/auth/app-session";
import { verifyCredentials } from "@/lib/auth/authjs";
import { getAuthProvider } from "@/lib/auth/production-config";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request): Promise<Response> {
  if (getAuthProvider() !== "authjs") {
    return errorResponse(400, "auth_not_configured", "Auth.js login is not enabled.");
  }

  const body = await readJsonBody<LoginBody>(request);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return errorResponse(400, "invalid_credentials", "Email and password are required.");
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return errorResponse(401, "invalid_credentials", "Email or password is incorrect.");
  }

  const sessionToken = await createAppSession(user.id);

  return jsonResponse({
    sessionToken,
    userId: user.id,
    email: user.email,
  });
}
