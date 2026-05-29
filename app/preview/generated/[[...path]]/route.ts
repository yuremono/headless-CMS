import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  PREVIEW_GENERATED_DIR,
  PREVIEW_GENERATED_MANIFEST,
} from "@/lib/preview/generated-output-path";

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function resolveSafePath(segments: string[]): string | null {
  if (segments.length === 0) {
    return null;
  }

  const resolved = path.resolve(PREVIEW_GENERATED_DIR, ...segments);
  const relative = path.relative(PREVIEW_GENERATED_DIR, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments = [] } = await context.params;
  const filePath =
    segments.length === 0
      ? path.join(PREVIEW_GENERATED_DIR, PREVIEW_GENERATED_MANIFEST)
      : resolveSafePath(segments);

  if (!filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
