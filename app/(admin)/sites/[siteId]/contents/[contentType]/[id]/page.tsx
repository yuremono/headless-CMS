import { ContentEditView } from '../../../../../../../components/admin/ContentEditView';

interface ContentEditPageProps {
  params: Promise<{ siteId: string; contentType: string; id: string }>;
}

export default async function ContentEditPage({ params }: ContentEditPageProps) {
  const { siteId, contentType, id } = await params;
  return (
    <ContentEditView
      siteId={siteId}
      contentType={contentType}
      id={id}
      formLayout={contentType === 'topPage' ? 'composable' : 'schema'}
    />
  );
}
