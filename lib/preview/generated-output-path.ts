import path from "node:path";

/** CMS 静的 HTML エクスポート先（`lib/static-export` と共有） */
export const PREVIEW_GENERATED_DIR = path.join(
  process.cwd(),
  "examples",
  "preview",
  "generated",
);

/** エクスポート成果物の manifest（generated-hub が参照） */
export const PREVIEW_GENERATED_MANIFEST = "manifest.json";
