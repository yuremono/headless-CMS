import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./app-session", () => ({
  validateAppSession: vi.fn(),
}));

import { validateAppSession } from "./app-session";
import { resolveProductionSession } from "./session-bridge";

const mockedValidateAppSession = vi.mocked(validateAppSession);
const originalEnv = { ...process.env };

describe("resolveProductionSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CMS_AUTH_PROVIDER;
    mockedValidateAppSession.mockResolvedValue(null);
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
    expect(mockedValidateAppSession).not.toHaveBeenCalled();
  });

  it("provider authjs で DB セッションを解決", async () => {
    process.env.CMS_AUTH_PROVIDER = "authjs";
    mockedValidateAppSession.mockResolvedValue({
      userId: "u1",
      sessionToken: "tok",
      email: "admin@example.com",
    });

    const result = await resolveProductionSession(
      new Request("https://example.com"),
      "tok",
    );

    expect(result).toEqual({
      userId: "u1",
      sessionToken: "tok",
      email: "admin@example.com",
    });
  });

  it("provider supabase は null（未実装）", async () => {
    process.env.CMS_AUTH_PROVIDER = "supabase";

    const result = await resolveProductionSession(
      new Request("https://example.com"),
      "tok",
    );

    expect(result).toBeNull();
  });
});
