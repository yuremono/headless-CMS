const PUBLIC_ADMIN_PATHS = new Set(["/login"]);

export function isAdminUiPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return false;
  }
  if (pathname.startsWith("/_next")) {
    return false;
  }
  if (pathname === "/favicon.ico") {
    return false;
  }
  return true;
}

export function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.has(pathname);
}

export function hasCmsSessionToken(request: Request): boolean {
  const header = request.headers.get("x-session-token")?.trim();
  if (header) {
    return true;
  }

  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return false;
  }

  return cookie.split(";").some((part) => part.trim().startsWith("cms_session="));
}

export function buildLoginRedirectUrl(requestUrl: string, pathname: string): URL {
  const login = new URL("/login", requestUrl);
  if (pathname && pathname !== "/login") {
    login.searchParams.set("redirect", pathname);
  }
  return login;
}
