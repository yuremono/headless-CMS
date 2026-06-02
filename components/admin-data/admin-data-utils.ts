import type { SiteSummary } from '@/components/admin-data/admin-data-types';

export function siteRouteKey(site: SiteSummary): string {
  return site.slug || site.id;
}
