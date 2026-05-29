import Link from 'next/link';
import { AdminLayout } from '../../../../../components/admin/AdminLayout';
import { AdminPageHeader } from '../../../../../components/admin/AdminPageHeader';
import { AdminApiNotice } from '../../../../../components/admin/AdminApiNotice';
import { getSiteDefinition, loadContents, resolveSiteSummary } from '../../../../../components/admin/AdminData';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';

interface ContentsHubPageProps {
  params: Promise<{ siteId: string }>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function ContentsHubPage({ params }: ContentsHubPageProps) {
  const { siteId } = await params;
  const site = (await resolveSiteSummary(siteId)) ?? getSiteDefinition(siteId);
  const [pages, news] = await Promise.all([loadContents(siteId, 'page'), loadContents(siteId, 'news')]);
  const items = [...pages.data, ...news.data].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const meta = pages.meta.source === 'demo' ? pages.meta : news.meta;
  const access = await getAdminUiAccess(siteId);

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title="コンテンツ一覧"
        subtitle="collection 型のコンテンツをサイト全体で確認できます。"
        actions={
          <>
            <Link href={`/sites/${siteId}/content-types`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
              コンテンツ種類
            </Link>
            <Link href={`/sites/${siteId}/contents/news`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              お知らせ一覧
            </Link>
          </>
        }
      />
      <AdminApiNotice source={meta.source} error={meta.error} endpoint={meta.endpoint} />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20">
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">種類</th>
                <th className="px-4 py-3 font-medium">タイトル</th>
                <th className="px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3 font-medium">更新日</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/40 text-slate-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 text-slate-300">{item.contentType}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.summary}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{item.status}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{formatDate(item.updatedAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/sites/${siteId}/contents/${item.contentType}/${item.id}`}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {access.readOnly ? '詳細' : '編集'}
                      </Link>
                      <Link
                        href={`/sites/${siteId}/contents/${item.contentType}`}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-100"
                      >
                        種類別一覧
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
