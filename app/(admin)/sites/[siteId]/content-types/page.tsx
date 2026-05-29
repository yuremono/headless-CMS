import Link from 'next/link';
import { AdminLayout } from '../../../../../components/admin/AdminLayout';
import { AdminPageHeader } from '../../../../../components/admin/AdminPageHeader';
import { AdminApiNotice } from '../../../../../components/admin/AdminApiNotice';
import { ContentTypeList } from '../../../../../components/admin/ContentTypeList';
import { loadContentTypes, loadContents, resolveSiteSummary } from '../../../../../components/admin/AdminData';

interface ContentTypesPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function ContentTypesPage({ params }: ContentTypesPageProps) {
  const { siteId } = await params;
  const site = await resolveSiteSummary(siteId);
  const [contentTypes, topPage, pages, news] = await Promise.all([
    loadContentTypes(siteId),
    loadContents(siteId, 'topPage'),
    loadContents(siteId, 'page'),
    loadContents(siteId, 'news'),
  ]);

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title="コンテンツ種類一覧"
        subtitle="topPage / page / news のスキーマを読み取り表示し、編集フォームに利用します。"
        actions={
          <>
            <Link href={`/sites/${siteId}`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
              サイト概要
            </Link>
            <Link href={`/sites/${siteId}/contents/topPage`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              トップページ編集
            </Link>
          </>
        }
      />
      <AdminApiNotice source={contentTypes.meta.source} error={contentTypes.meta.error} endpoint={contentTypes.meta.endpoint} />
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        管理画面は GUI 必須です。JSON 定義だけではなく、一覧と編集の両方からスキーマを確認できます。
      </div>
      <ContentTypeList
        siteId={siteId}
        contentTypes={contentTypes.data}
        records={[...topPage.data, ...pages.data, ...news.data]}
      />
    </AdminLayout>
  );
}
