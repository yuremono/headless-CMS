import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/production-config", () => ({
  getAuthProvider: vi.fn(),
}));

vi.mock("@/lib/auth/authjs", () => ({
  verifyCredentials: vi.fn(),
}));

vi.mock("@/lib/auth/app-session", () => ({
  createAppSession: vi.fn(),
}));

import { getAuthProvider } from "@/lib/auth/production-config";
import { verifyCredentials } from "@/lib/auth/authjs";
import { createAppSession } from "@/lib/auth/app-session";
import { POST } from "./route";

const mockedGetAuthProvider = vi.mocked(getAuthProvider);
const mockedVerifyCredentials = vi.mocked(verifyCredentials);
const mockedCreateAppSession = vi.mocked(createAppSession);

describe("POST /api/admin/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthProvider.mockReturnValue("authjs");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provider が none のとき 400", async () => {
    mockedGetAuthProvider.mockReturnValue("none");

    const response = await POST(
      new Request("https://example.com/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "x" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("認証成功時 sessionToken を返す", async () => {
    mockedVerifyCredentials.mockResolvedValue({ id: "u1", email: "admin@example.com" });
    mockedCreateAppSession.mockResolvedValue("session-tok-abc");

    const response = await POST(
      new Request("https://example.com/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "admin1234" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessionToken: "session-tok-abc",
      userId: "u1",
      email: "admin@example.com",
    });
  });

  it("認証失敗時 401", async () => {
    mockedVerifyCredentials.mockResolvedValue(null);

    const response = await POST(
      new Request("https://example.com/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "wrong" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
