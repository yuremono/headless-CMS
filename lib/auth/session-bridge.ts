import { validateAppSession } from "./app-session";
import { getAuthProvider } from "./production-config";

export interface ProductionSession {
  userId: string;
  sessionToken: string;
  email?: string;
}

/** Phase 3-B: Auth.js / Supabase 実装をここに集約 */
export async function resolveProductionSession(
  _request: Request,
  token: string,
): Promise<ProductionSession | null> {
  const provider = getAuthProvider();
  if (provider === "none") {
    return null;
  }

  if (provider === "authjs") {
    const session = await validateAppSession(token);
    if (!session) {
      return null;
    }

    return {
      userId: session.userId,
      sessionToken: session.sessionToken,
      email: session.email ?? undefined,
    };
  }

  return null;
}
