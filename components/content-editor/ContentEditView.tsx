import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { AdminLayout } from '@/components/admin-layout/AdminLayout';
import { AdminPageHeader } from '@/components/admin-layout/AdminPageHeader';
import { AdminApiNotice } from '@/components/admin-layout/AdminApiNotice';
import { ComposableContentForm } from '@/components/content-editor/ComposableContentForm';
import type { ComposableFieldDefinitions, ComposableFieldDirectories } from '@/components/content-editor/ComposableContentForm.model';
import { PreviewLink } from '@/components/admin-layout/PreviewLink';
import { loadContent, resolveContentTypeDefinition, resolveSiteSummary } from '@/components/admin-data/AdminData';
import { buildPreviewUrl } from '@/lib/preview';
import { getAdminUiAccess } from '@/lib/auth/admin-ui-access';
import { getAuthProvider } from '@/lib/auth/production-config';
import { getSchemaByType } from '@/lib/content/service';
import { isComposableFieldFormat, type ComposableFieldFormat } from '@/lib/admin/field-type-catalog';

const MANUAL_MARKDOWN_PATH = path.join(
	process.cwd(),
	'components/content-editor/UserManual.md',
);

async function loadUserManualMarkdown(): Promise<string> {
	try {
		return await readFile(MANUAL_MARKDOWN_PATH, 'utf8');
	} catch {
		return '';
	}
}

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
	const manualMarkdown = isComposable ? await loadUserManualMarkdown() : '';
	const pageTitle = isComposable
		? 'ページ名'
		: access.readOnly
      ? `${definition.label} 詳細`
      : `${definition.label} 編集`;

  return (
    <AdminLayout site={site} hideSidebar={isComposable ? true : hideSidebar}>

      <AdminApiNotice source={record.meta.source} error={record.meta.error} endpoint={record.meta.endpoint} />
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
        manualMarkdown={manualMarkdown}
      />

    </AdminLayout>
  );
}
