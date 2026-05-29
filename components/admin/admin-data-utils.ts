import type { SiteSummary } from './admin-data-types';

export function siteRouteKey(site: SiteSummary): string {
  return site.slug || site.id;
}
