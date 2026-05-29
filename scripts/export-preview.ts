import "dotenv/config";
import { exportSiteContent } from "@/lib/static-export";

const siteSlug = process.env.EXPORT_PREVIEW_SITE ?? "main-site";

async function main() {
  const result = await exportSiteContent(siteSlug, { includeDraft: true });
  console.log(`Exported ${result.exported} file(s) for site "${result.siteSlug}"`);
  if (result.paths.length > 0) {
    console.log(result.paths.join("\n"));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
