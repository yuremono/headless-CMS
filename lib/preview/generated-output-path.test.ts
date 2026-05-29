import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PREVIEW_GENERATED_DIR,
  PREVIEW_GENERATED_MANIFEST,
} from "./generated-output-path";

describe("generated-output-path", () => {
  it("PREVIEW_GENERATED_DIR は examples/preview/generated を指す", () => {
    expect(PREVIEW_GENERATED_DIR).toBe(
      path.join(process.cwd(), "examples", "preview", "generated"),
    );
  });

  it("PREVIEW_GENERATED_MANIFEST は manifest.json", () => {
    expect(PREVIEW_GENERATED_MANIFEST).toBe("manifest.json");
  });
});
