export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, init);
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
