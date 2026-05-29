import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveProductionSession } from "./session-bridge";

const originalEnv = { ...process.env };

describe("resolveProductionSession", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CMS_AUTH_PROVIDER;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("provider none のとき null", async () => {
    const result = await resolveProductionSession(
      new Request("https://example.com"),
      "any-token",
    );
    expect(result).toBeNull();
  });

  it("provider 有効でもスタブは null（フェーズ B まで）", async () => {
    process.env.CMS_AUTH_PROVIDER = "authjs";
    const result = await resolveProductionSession(
      new Request("https://example.com"),
      "any-token",
    );
    expect(result).toBeNull();
  });
});
