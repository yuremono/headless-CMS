import { notFound } from 'next/navigation';
import { ContentEditView } from '../../../../../components/admin/ContentEditView';
import { loadContents } from '../../../../../components/admin/AdminData';

interface DeveloperPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function DeveloperPage({ params }: DeveloperPageProps) {
  const { siteId } = await params;
  const topPageResult = await loadContents(siteId, 'topPage');
  const topPageRecord = topPageResult.data[0] ?? null;

  if (!topPageRecord) {
    notFound();
  }

  return (
    <ContentEditView
      siteId={siteId}
      contentType="topPage"
      id={topPageRecord.id}
      formLayout="composable"
    />
  );
}
