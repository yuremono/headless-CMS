import type { ContentRecord } from "@/lib/content/types";
import { resolveSite } from "@/lib/db/site-resolver";
import { exportContent } from "./export";

/**
 * コンテンツ保存後に静的 HTML を書き出す（失敗しても API 応答には影響しない）。
 */
export function scheduleContentExport(content: ContentRecord): void {
  void runContentExport(content).catch((error) => {
    console.error("[static-export] export failed:", error);
  });
}

async function runContentExport(content: ContentRecord): Promise<void> {
  const site = await resolveSite(content.siteId);
  if (!site) {
    return;
  }

  await exportContent(content, site.slug);
}
