import { notFound } from 'next/navigation';
import { ContentEditView } from '../../components/admin/ContentEditView';
import { loadContents, loadDashboardSnapshot, siteRouteKey } from '../../components/admin/AdminData';

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
