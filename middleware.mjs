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

export function middleware(request) {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = request.headers.get("origin");
  const corsOrigin = requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin;

  if (request.method === "OPTIONS") {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), corsOrigin);
  }

  const response = NextResponse.next();
  return applyCorsHeaders(response, corsOrigin);
}

export const config = {
  matcher: "/api/:path*",
};
