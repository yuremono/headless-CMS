import Link from 'next/link';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { AdminPageHeader } from '../../../../components/admin/AdminPageHeader';
import { AdminApiNotice } from '../../../../components/admin/AdminApiNotice';
import { DashboardOverview } from '../../../../components/admin/DashboardOverview';
import { notFound } from 'next/navigation';
import { loadContents, loadDashboardSnapshot, resolveSiteSummary, siteRouteKey } from '../../../../components/admin/AdminData';

interface SitePageProps {
  params: Promise<{ siteId: string }>;
}

export default async function SiteDashboardPage({ params }: SitePageProps) {
  const { siteId } = await params;
  const site = (await resolveSiteSummary(siteId)) ?? (await loadDashboardSnapshot(siteId)).data.sites[0];
  if (!site) {
    notFound();
  }

  const siteKey = siteRouteKey(site);
  const [topPage, pages, news] = await Promise.all([
    loadContents(siteKey, 'topPage'),
    loadContents(siteKey, 'page'),
    loadContents(siteKey, 'news'),
  ]);

  const recentContents = [...topPage.data, ...pages.data, ...news.data].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
  const meta = [topPage.meta, pages.meta, news.meta].find((item) => item.source === 'demo') ?? topPage.meta;

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title={`${site.name} / サイト概要`}
        subtitle={site.description}
        actions={
          <>
            <Link href={`/sites/${siteKey}/content-types`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
              コンテンツ種類
            </Link>
            <Link href={`/sites/${siteKey}/contents/topPage`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              トップページ編集
            </Link>
          </>
        }
      />
      <AdminApiNotice source={meta.source} error={meta.error} endpoint={meta.endpoint} />
      <DashboardOverview sites={[site]} recentContents={recentContents} />
    </AdminLayout>
  );
}
