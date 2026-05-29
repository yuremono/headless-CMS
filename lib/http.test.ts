import { describe, expect, it } from "vitest";
import {
  clonePlainObject,
  errorResponse,
  isPlainObject,
  jsonResponse,
  parseBooleanQuery,
  parsePagination,
  readJsonBody,
} from "./http";

describe("parsePagination", () => {
  it("デフォルト limit/offset を返す", () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ limit: 20, offset: 0 });
  });

  it("limit は 1〜100 にクランプする", () => {
    expect(parsePagination(new URLSearchParams("limit=0"))).toEqual({ limit: 1, offset: 0 });
    expect(parsePagination(new URLSearchParams("limit=500"))).toEqual({ limit: 100, offset: 0 });
  });

  it("offset は 0 未満にならない", () => {
    expect(parsePagination(new URLSearchParams("offset=-5"))).toEqual({ limit: 20, offset: 0 });
  });
});

describe("parseBooleanQuery", () => {
  it("真値文字列を true に解釈する", () => {
    expect(parseBooleanQuery("true")).toBe(true);
    expect(parseBooleanQuery("1")).toBe(true);
    expect(parseBooleanQuery("YES")).toBe(true);
  });

  it("null の場合は fallback を返す", () => {
    expect(parseBooleanQuery(null, true)).toBe(true);
    expect(parseBooleanQuery(null, false)).toBe(false);
  });
});

describe("readJsonBody", () => {
  it("JSON ボディをパースする", async () => {
    const request = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ title: "Hello" }),
    });
    await expect(readJsonBody(request)).resolves.toEqual({ title: "Hello" });
  });

  it("空ボディは null を返す", async () => {
    const request = new Request("https://example.com", { method: "POST", body: "" });
    await expect(readJsonBody(request)).resolves.toBeNull();
  });

  it("不正 JSON は null を返す", async () => {
    const request = new Request("https://example.com", { method: "POST", body: "{" });
    await expect(readJsonBody(request)).resolves.toBeNull();
  });
});

describe("isPlainObject / clonePlainObject", () => {
  it("プレーンオブジェクトのみ true", () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
  });

  it("深いコピーを返す", () => {
    const source = { nested: { value: 1 } };
    const cloned = clonePlainObject(source);
    cloned.nested.value = 2;
    expect(source.nested.value).toBe(1);
  });
});

describe("jsonResponse / errorResponse", () => {
  it("jsonResponse は JSON レスポンスを返す", async () => {
    const response = jsonResponse({ ok: true });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("errorResponse は code と error を含む", async () => {
    const response = errorResponse(404, "not_found", "Not found.");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "not_found",
      error: "Not found.",
    });
  });
});
