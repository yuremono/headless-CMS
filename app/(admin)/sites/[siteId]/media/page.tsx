import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminApiNotice } from '../../../../../components/admin/AdminApiNotice';
import { AdminLayout } from '../../../../../components/admin/AdminLayout';
import { AdminPageHeader } from '../../../../../components/admin/AdminPageHeader';
import { loadAssets, resolveSiteSummary, siteRouteKey } from '../../../../../components/admin/AdminData';
import { MediaLibrary } from '../../../../../components/admin/MediaLibrary';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';

interface MediaPageProps {
  params: Promise<{ siteId: string }>;
}

export default async function MediaPage({ params }: MediaPageProps) {
  const { siteId } = await params;
  const site = await resolveSiteSummary(siteId);

  if (!site) {
    notFound();
  }

  const siteKey = siteRouteKey(site);
  const assets = await loadAssets(siteKey);
  const access = await getAdminUiAccess(siteKey);

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title="メディアライブラリ"
        subtitle={
          access.readOnly
            ? 'アップロード済みアセットの一覧表示と確認ができます。'
            : 'アップロード済みアセットの一覧表示、代替テキスト編集、新規アップロードを行います。'
        }
        actions={
          <>
            <Link
              href={`/sites/${siteKey}`}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white"
            >
              サイト概要
            </Link>
            <Link
              href={`/sites/${siteKey}/contents/topPage`}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950"
            >
              {access.readOnly ? 'コンテンツ詳細' : 'コンテンツ編集'}
            </Link>
          </>
        }
      />
      <AdminApiNotice source={assets.meta.source} error={assets.meta.error} endpoint={assets.meta.endpoint} />
      <MediaLibrary siteId={siteKey} initialAssets={assets.data} />
    </AdminLayout>
  );
}
