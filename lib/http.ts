export type DeliveryCacheScope = "collection" | "item";

const DELIVERY_CACHE_NO_STORE = "no-store";
const DELIVERY_CACHE_COLLECTION = "public, max-age=30, s-maxage=120";
const DELIVERY_CACHE_ITEM = "public, max-age=60, s-maxage=300";

export function resolveDeliveryCacheControl(includeDraft: boolean, scope: DeliveryCacheScope): string {
  if (includeDraft) {
    return DELIVERY_CACHE_NO_STORE;
  }

  return scope === "collection" ? DELIVERY_CACHE_COLLECTION : DELIVERY_CACHE_ITEM;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, init);
}

export function deliveryJsonResponse(
  body: unknown,
  includeDraft: boolean,
  scope: DeliveryCacheScope,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", resolveDeliveryCacheControl(includeDraft, scope));
  return jsonResponse(body, { ...init, headers });
}

export function deliveryErrorResponse(status: number, code: string, error: string): Response {
  return jsonResponse(
    { error, code },
    {
      status,
      headers: { "Cache-Control": DELIVERY_CACHE_NO_STORE },
    },
  );
}

export function errorResponse(status: number, code: string, error: string): Response {
  return jsonResponse({ error, code }, { status });
}

export function parsePagination(searchParams: URLSearchParams): { limit: number; offset: number } {
  const limitValue = Number(searchParams.get("limit") ?? "20");
  const offsetValue = Number(searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(Math.trunc(limitValue), 1), 100) : 20;
  const offset = Number.isFinite(offsetValue) ? Math.max(Math.trunc(offsetValue), 0) : 0;

  return { limit, offset };
}

export function parseBooleanQuery(value: string | null, fallback = false): boolean {
  if (value === null) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export async function readJsonBody<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  const text = await request.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clonePlainObject<T extends Record<string, unknown>>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
