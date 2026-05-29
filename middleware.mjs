import { NextResponse } from "next/server";

function getAllowedOrigin() {
  return process.env.FRONTEND_BASE_URL?.trim() || "http://localhost:3001";
}

function buildCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-api-key, x-admin-api-key, x-public-api-key, x-preview-token, x-session-token",
    "Access-Control-Max-Age": "86400",
  };
}

function applyCorsHeaders(response, origin) {
  for (const [key, value] of Object.entries(buildCorsHeaders(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

function isAdminLoginEnforced() {
  return process.env.CMS_ENFORCE_ADMIN_LOGIN === "true";
}

function isAdminUiPath(pathname) {
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

function isPublicAdminPath(pathname) {
  return pathname === "/login";
}

function hasCmsSessionToken(request) {
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

function handleApiCors(request) {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = request.headers.get("origin");
  const corsOrigin = requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin;

  if (request.method === "OPTIONS") {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), corsOrigin);
  }

  const response = NextResponse.next();
  return applyCorsHeaders(response, corsOrigin);
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return handleApiCors(request);
  }

  if (
    isAdminLoginEnforced() &&
    isAdminUiPath(pathname) &&
    !isPublicAdminPath(pathname) &&
    !hasCmsSessionToken(request)
  ) {
    const login = new URL("/login", request.url);
    if (pathname !== "/login") {
      login.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
