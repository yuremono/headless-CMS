export type CmsAuthProvider = "none" | "authjs" | "supabase";

export function getAuthProvider(): CmsAuthProvider {
  const raw = process.env.CMS_AUTH_PROVIDER?.trim().toLowerCase();
  if (raw === "authjs" || raw === "supabase") {
    return raw;
  }
  return "none";
}

export function isAdminLoginEnforced(): boolean {
  return process.env.CMS_ENFORCE_ADMIN_LOGIN === "true";
}

export function authProviderLabel(provider: CmsAuthProvider): string {
  if (provider === "authjs") {
    return "Auth.js";
  }
  if (provider === "supabase") {
    return "Supabase Auth";
  }
  return "デモ（環境変数）";
}
