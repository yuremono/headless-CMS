import { notFound } from 'next/navigation';
import { AdminLayout } from './AdminLayout';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminApiNotice } from './AdminApiNotice';
import { ComposableContentForm } from './ComposableContentForm';
import { ContentForm } from './ContentForm';
import { PreviewLink } from './PreviewLink';
import { loadContent, resolveContentTypeDefinition, resolveSiteSummary } from './AdminData';
import { buildPreviewUrl } from '@/lib/preview';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';

interface ContentEditViewProps {
  siteId: string;
  contentType: string;
  id: string;
  formLayout?: 'schema' | 'composable';
}

export async function ContentEditView({
  siteId,
  contentType,
  id,
  formLayout = 'schema',
}: ContentEditViewProps) {
  const site = await resolveSiteSummary(siteId);
  const definitionResult = await resolveContentTypeDefinition(siteId, contentType);
  const definition = definitionResult.data;

  if (!site || !definition) {
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

  const isComposable = formLayout === 'composable';
  const pageTitle = isComposable
    ? 'ページ名'
    : access.readOnly
      ? `${definition.label} 詳細`
      : `${definition.label} 編集`;

  return (
    <AdminLayout site={site}>
      <AdminPageHeader
        title={pageTitle}
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
          </>
        }
      />
      <AdminApiNotice source={record.meta.source} error={record.meta.error} endpoint={record.meta.endpoint} />
      {isComposable ? (
        <ComposableContentForm
          siteId={siteId}
          contentType={definition}
          record={record.data}
          previewUrl={previewUrl}
        />
      ) : (
        <ContentForm
          siteId={siteId}
          contentType={definition}
          record={record.data}
          mode="edit"
          previewUrl={previewUrl}
        />
      )}
    </AdminLayout>
  );
}
