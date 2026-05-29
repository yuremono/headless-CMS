import { describe, expect, it } from "vitest";
import { resolveContentUserId } from "./content-user";

describe("resolveContentUserId", () => {
  it("userId があればそれを返す", () => {
    expect(
      resolveContentUserId({ actorId: "session:site-1", userId: "user-abc" }),
    ).toBe("user-abc");
  });

  it("合成 actorId（コロン含む）は null", () => {
    expect(resolveContentUserId({ actorId: "session:site-1" })).toBeNull();
    expect(resolveContentUserId({ actorId: "admin:site-1" })).toBeNull();
  });

  it("プレーンな User ID はそのまま返す", () => {
    expect(resolveContentUserId({ actorId: "user-abc" })).toBe("user-abc");
  });

  it("空 actorId は null", () => {
    expect(resolveContentUserId({ actorId: "" })).toBeNull();
  });
});
