import { notFound } from 'next/navigation';
import { AdminLayout } from './AdminLayout';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminApiNotice } from './AdminApiNotice';
import { ComposableContentForm } from './ComposableContentForm';
import type { ComposableFieldDefinitions, ComposableFieldDirectories } from './ComposableContentForm';
import { ContentForm } from './ContentForm';
import { PreviewLink } from './PreviewLink';
import { loadContent, resolveContentTypeDefinition, resolveSiteSummary } from './AdminData';
import { buildPreviewUrl } from '@/lib/preview';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';
import { getAuthProvider } from '@/lib/auth/production-config';
import { getSchemaByType } from '@/lib/content/service';
import { isComposableFieldFormat, type ComposableFieldFormat } from '@/lib/admin/field-type-catalog';

function readComposableFieldFormats(schemaJson: Record<string, unknown>): Record<string, ComposableFieldFormat> {
  const raw = schemaJson.composableFieldFormats;
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const formats: Record<string, ComposableFieldFormat> = {};
  for (const [path, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isComposableFieldFormat(value)) {
      formats[path] = value;
    }
  }
  return formats;
}

function isComposableFieldDirectories(value: unknown): value is ComposableFieldDirectories {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const directories = (value as { directories?: unknown }).directories;
  if (!Array.isArray(directories)) {
    return false;
  }
  const activeDirectoryId = (value as { activeDirectoryId?: unknown }).activeDirectoryId;
  if (activeDirectoryId !== undefined && typeof activeDirectoryId !== 'string') {
    return false;
  }

  return directories.every((directory) => {
    if (!directory || typeof directory !== 'object') {
      return false;
    }

    const candidate = directory as { id?: unknown; name?: unknown; prefixes?: unknown };
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      Array.isArray(candidate.prefixes) &&
      candidate.prefixes.every((prefix) => typeof prefix === 'string')
    );
  });
}

function isComposableFieldDefinitions(value: unknown): value is ComposableFieldDefinitions {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const groups = (value as { groups?: unknown }).groups;
  if (!Array.isArray(groups)) {
    return false;
  }

  return groups.every((group) => {
    if (!group || typeof group !== 'object') {
      return false;
    }
    const candidate = group as { prefix?: unknown; repeatable?: unknown; fields?: unknown };
    if (
      typeof candidate.prefix !== 'string' ||
      (candidate.repeatable !== undefined && typeof candidate.repeatable !== 'boolean') ||
      !Array.isArray(candidate.fields)
    ) {
      return false;
    }

    return candidate.fields.every((field) => {
      if (!field || typeof field !== 'object') {
        return false;
      }
      const row = field as { type?: unknown; suffix?: unknown; format?: unknown; bundle?: unknown };
      return (
        typeof row.type === 'string' &&
        typeof row.suffix === 'string' &&
        (row.format === undefined || row.format === 'plain' || row.format === 'richText') &&
        (row.bundle === undefined || row.bundle === 'image')
      );
    });
  });
}

async function loadComposableMetadata(
  siteId: string,
  contentType: string,
): Promise<{
  fieldFormats: Record<string, ComposableFieldFormat>;
  fieldDirectories: ComposableFieldDirectories | undefined;
  fieldDefinitions: ComposableFieldDefinitions | undefined;
}> {
  const schema = await getSchemaByType(siteId, contentType);
  const schemaJson = (schema?.schemaJson ?? {}) as Record<string, unknown>;
  const rawDirectories = schemaJson.composableFieldDirectories;
  const rawDefinitions = schemaJson.composableFieldDefinitions;
  return {
    fieldFormats: readComposableFieldFormats(schemaJson),
    fieldDirectories: isComposableFieldDirectories(rawDirectories) ? rawDirectories : undefined,
    fieldDefinitions: isComposableFieldDefinitions(rawDefinitions) ? rawDefinitions : undefined,
  };
}

interface ContentEditViewProps {
  siteId: string;
  contentType: string;
  id: string;
  formLayout?: 'schema' | 'composable';
  hideSidebar?: boolean;
}

export async function ContentEditView({
  siteId,
  contentType,
  id,
  formLayout = 'schema',
  hideSidebar = false,
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
  const authProvider = getAuthProvider();

  const isComposable = formLayout === 'composable';
  const composableMetadata = isComposable
    ? await loadComposableMetadata(siteId, contentType)
    : { fieldFormats: {}, fieldDirectories: undefined, fieldDefinitions: undefined };
  const pageTitle = isComposable
    ? 'ページ名'
    : access.readOnly
      ? `${definition.label} 詳細`
      : `${definition.label} 編集`;

  return (
    <AdminLayout site={site} hideSidebar={isComposable ? true : hideSidebar}>
      {/* <AdminPageHeader
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
      /> */}
      <AdminApiNotice source={record.meta.source} error={record.meta.error} endpoint={record.meta.endpoint} />
      {isComposable ? (
        <ComposableContentForm
          siteId={siteId}
          contentType={definition}
          record={record.data}
          previewUrl={previewUrl}
          fieldFormats={composableMetadata.fieldFormats}
          fieldDirectories={composableMetadata.fieldDirectories}
          fieldDefinitions={composableMetadata.fieldDefinitions}
          authProvider={authProvider}
          showLogout={isComposable || hideSidebar}
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
