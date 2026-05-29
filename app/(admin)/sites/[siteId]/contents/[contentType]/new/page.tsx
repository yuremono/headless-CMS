import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminLayout } from '../../../../../../../components/admin/AdminLayout';
import { AdminPageHeader } from '../../../../../../../components/admin/AdminPageHeader';
import { AdminApiNotice } from '../../../../../../../components/admin/AdminApiNotice';
import { ContentForm } from '../../../../../../../components/admin/ContentForm';
import { resolveContentTypeDefinition, resolveSiteSummary } from '../../../../../../../components/admin/AdminData';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';

interface ContentNewPageProps {
  params: Promise<{ siteId: string; contentType: string }>;
}

export default async function ContentNewPage({ params }: ContentNewPageProps) {
  const { siteId, contentType } = await params;
  const site = await resolveSiteSummary(siteId);
  const definitionResult = await resolveContentTypeDefinition(siteId, contentType);
  const definition = definitionResult.data;

  if (!definition) {
    notFound();
  }

  const access = await getAdminUiAccess(siteId);
  if (access.readOnly) {
    redirect(`/sites/${siteId}/contents/${contentType}`);
  }

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title={`${definition.label} 新規作成`}
        subtitle="single / collection どちらも同じフォームで扱います。"
        actions={
          <>
            <Link href={`/sites/${siteId}/contents/${contentType}`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
              一覧に戻る
            </Link>
            <Link href={`/sites/${siteId}/content-types`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              コンテンツ種類
            </Link>
          </>
        }
      />
      <AdminApiNotice source={definitionResult.meta.source} error={definitionResult.meta.error} endpoint={definitionResult.meta.endpoint} />
      <ContentForm siteId={siteId} contentType={definition} record={null} mode="create" />
    </AdminLayout>
  );
}
