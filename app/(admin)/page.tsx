import Link from 'next/link';
import { getAuthProvider } from '@/lib/auth/production-config';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { LogoutButton } from '../../components/admin/LogoutButton';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminApiNotice } from '../../components/admin/AdminApiNotice';
import { DashboardOverview } from '../../components/admin/DashboardOverview';
import { loadDashboardSnapshot, siteRouteKey } from '../../components/admin/AdminData';

export default async function AdminDashboardPage() {
  const snapshot = await loadDashboardSnapshot();
  const firstSite = snapshot.data.sites[0];
  const authProvider = getAuthProvider();

  return (
    <AdminLayout>
      <AdminPageHeader
        title="ダッシュボード"
        subtitle="サイト一覧、最近更新されたコンテンツ、公開状況をまとめて確認できます。"
        actions={
          <>
            <LogoutButton
              authProvider={authProvider}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-rose-400/30 hover:bg-rose-400/10"
            />
            {firstSite ? (
              <Link href={`/sites/${siteRouteKey(firstSite)}`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
                サイト概要
              </Link>
            ) : null}
          </>
        }
      />
      <AdminApiNotice source={snapshot.meta.source} error={snapshot.meta.error} endpoint={snapshot.meta.endpoint} />
      <DashboardOverview sites={snapshot.data.sites} recentContents={snapshot.data.recentContents} />
    </AdminLayout>
  );
}
