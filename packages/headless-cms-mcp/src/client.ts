/**
 * Thin MCP adapter over @headless/cms-agent.
 * listContent is the only helper here (not yet on CmsAgentClient).
 */

import type { CmsAgentConfig, CmsClientResult } from '@headless/cms-agent/types';

export { createCmsAgentClient } from '@headless/cms-agent/api-client';
export type {
  AssetRecord,
  CmsAgentConfig,
  CmsClientResult,
  ContentRecord,
} from '@headless/cms-agent/types';

export interface ContentListItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  updatedAt?: string;
}

function resolveAgentConfig(config: CmsAgentConfig): { baseUrl: string; apiKey: string } {
  return {
    baseUrl: (config.baseUrl ?? process.env['CMS_BASE_URL'] ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    ),
    apiKey: config.apiKey ?? process.env['CMS_ADMIN_API_KEY'] ?? 'admin-dev-key',
  };
}

export function unwrapCmsResult<T>(result: CmsClientResult<T>): T {
  if (!result.ok || result.data === null) {
    throw new Error(result.error ?? `Request failed (HTTP ${result.status})`);
  }
  return result.data;
}

/** List content records for a site + content type (GET collection). */
export async function listContent(
  config: CmsAgentConfig,
  siteId: string,
  contentType: string,
): Promise<ContentListItem[]> {
  const { baseUrl, apiKey } = resolveAgentConfig(config);
  const res = await fetch(
    `${baseUrl}/api/admin/sites/${siteId}/content/${contentType}`,
    {
      headers: { Accept: 'application/json', 'x-api-key': apiKey },
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`listContent failed: HTTP ${res.status} — ${body}`);
  }

  const json = (await res.json()) as unknown;
  if (Array.isArray(json)) {
    return json as ContentListItem[];
  }
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o['items'])) {
      return o['items'] as ContentListItem[];
    }
  }
  return [];
}
