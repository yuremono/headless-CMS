import { getAuthProvider } from "./production-config";

export interface ProductionSession {
  userId: string;
  sessionToken: string;
  email?: string;
}

/** Phase 3-B: Auth.js / Supabase 実装をここに集約 */
export async function resolveProductionSession(
  _request: Request,
  _token: string,
): Promise<ProductionSession | null> {
  if (getAuthProvider() === "none") {
    return null;
  }
  return null;
}
