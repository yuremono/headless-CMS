import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminLayout } from '../../../../../../components/admin/AdminLayout';
import { AdminPageHeader } from '../../../../../../components/admin/AdminPageHeader';
import { AdminApiNotice } from '../../../../../../components/admin/AdminApiNotice';
import { ContentList } from '../../../../../../components/admin/ContentList';
import { loadContents, resolveContentTypeDefinition, resolveSiteSummary } from '../../../../../../components/admin/AdminData';

interface ContentListPageProps {
  params: Promise<{ siteId: string; contentType: string }>;
}

export default async function ContentListPage({ params }: ContentListPageProps) {
  const { siteId, contentType } = await params;
  const site = await resolveSiteSummary(siteId);
  const definitionResult = await resolveContentTypeDefinition(siteId, contentType);
  const definition = definitionResult.data;

  if (!definition) {
    notFound();
  }

  const records = await loadContents(siteId, contentType);

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title={`${definition.label} 一覧`}
        subtitle="検索、ステータス絞り込み、削除、公開をここで操作できます。"
        actions={
          <>
            <Link href={`/sites/${siteId}/content-types`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
              コンテンツ種類
            </Link>
            <Link href={`/sites/${siteId}/contents/${contentType}/new`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              新規作成
            </Link>
          </>
        }
      />
      <AdminApiNotice source={records.meta.source} error={records.meta.error} endpoint={records.meta.endpoint} />
      <ContentList siteId={siteId} contentType={definition} records={records.data} />
    </AdminLayout>
  );
}
