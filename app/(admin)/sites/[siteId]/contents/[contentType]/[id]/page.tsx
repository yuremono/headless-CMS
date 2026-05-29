import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminLayout } from '../../../../../../../components/admin/AdminLayout';
import { AdminPageHeader } from '../../../../../../../components/admin/AdminPageHeader';
import { AdminApiNotice } from '../../../../../../../components/admin/AdminApiNotice';
import { ContentForm } from '../../../../../../../components/admin/ContentForm';
import { PreviewLink } from '../../../../../../../components/admin/PreviewLink';
import { loadContent, resolveContentTypeDefinition, resolveSiteSummary } from '../../../../../../../components/admin/AdminData';
import { buildPreviewUrl } from '../../../../../../../lib/preview';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';

interface ContentEditPageProps {
  params: Promise<{ siteId: string; contentType: string; id: string }>;
}

export default async function ContentEditPage({ params }: ContentEditPageProps) {
  const { siteId, contentType, id } = await params;
  const site = await resolveSiteSummary(siteId);
  const definitionResult = await resolveContentTypeDefinition(siteId, contentType);
  const definition = definitionResult.data;

  if (!definition) {
    notFound();
  }

  const record = await loadContent(siteId, contentType, id);
  if (!record.data) {
    notFound();
  }

  const previewUrl = buildPreviewUrl({
    siteId,
    contentType: definition.slug,
    kind: definition.kind,
    contentId: definition.kind === 'single' ? record.data.id : undefined,
    slug: definition.kind === 'collection' ? record.data.slug : undefined,
  });
  const access = await getAdminUiAccess(siteId);

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title={access.readOnly ? `${definition.label} 詳細` : `${definition.label} 編集`}
        subtitle={`対象コンテンツ: ${record.data.title}`}
        actions={
          <>
            <PreviewLink
              siteId={siteId}
              contentType={definition.slug}
              kind={definition.kind}
              contentId={definition.kind === 'single' ? record.data.id : undefined}
              slug={definition.kind === 'collection' ? record.data.slug : undefined}
              className="rounded-full border border-violet-400/40 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-400/20"
            />
            <Link href={`/sites/${siteId}/contents/${contentType}`} className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white">
              一覧に戻る
            </Link>
            <Link href={`/sites/${siteId}/content-types`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
              コンテンツ種類
            </Link>
          </>
        }
      />
      <AdminApiNotice source={record.meta.source} error={record.meta.error} endpoint={record.meta.endpoint} />
      <ContentForm siteId={siteId} contentType={definition} record={record.data} mode="edit" previewUrl={previewUrl} />
    </AdminLayout>
  );
}
