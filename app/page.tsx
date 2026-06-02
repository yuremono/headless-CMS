import { notFound } from 'next/navigation';
import { loadContents, loadDashboardSnapshot, siteRouteKey } from '@/components/admin-data/AdminData';
import { ContentEditView } from '@/components/content-editor/ContentEditView';

/** Vercel ビルド時に DB へ接続しない（runtime のみ DB 使用） */
export const dynamic = 'force-dynamic';

export default async function AdminRootPage() {
  const snapshot = await loadDashboardSnapshot();
  const firstSite = snapshot.data.sites[0];

  if (!firstSite) {
    notFound();
  }

  const siteKey = siteRouteKey(firstSite);
  const topPageResult = await loadContents(siteKey, 'topPage');
  const topPageRecord = topPageResult.data[0] ?? null;

  if (!topPageRecord) {
    notFound();
  }

  return (
    <ContentEditView
      siteId={siteKey}
      contentType="topPage"
      id={topPageRecord.id}
      formLayout="composable"
    />
  );
}
