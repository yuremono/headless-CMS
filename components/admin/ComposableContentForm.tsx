'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CmsAuthProvider } from '@/lib/auth/production-config';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import {
  adminFetch,
  buildContentWriteBody,
  mapApiContentRecord,
  writeFieldValue,
  type ApiContentRecord,
} from './admin-api';
import { FieldAddPanel } from './FieldAddPanel';
import { FieldGroup } from './FieldGroup';
import type { ContentRecord, ContentTypeDefinition } from './admin-data-types';
import {
  buildRepeatableArrayValue,
  collectComposableFieldFormats,
  duplicateFieldGroup,
  nextDuplicatePrefix,
  restoreGroupsFromData,
  type ComposableFieldFormat,
  type ComposableFieldGroup,
  type ComposableFieldRow,
} from '@/lib/admin/field-type-catalog';

interface ComposableContentFormProps {
  siteId: string;
  contentType: ContentTypeDefinition;
  record: ContentRecord;
  previewUrl?: string | null;
  fieldFormats?: Record<string, ComposableFieldFormat>;
  authProvider?: CmsAuthProvider;
  showLogout?: boolean;
}

function createGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeDataForSave(
  baseData: Record<string, unknown>,
  groups: ComposableFieldGroup[],
): Record<string, unknown> {
  const merged = structuredClone(baseData) as Record<string, unknown>;

  for (const group of groups) {
    if (group.repeatable) {
      const normalizedPrefix = group.prefix.trim();
      if (normalizedPrefix) {
        merged[normalizedPrefix] = buildRepeatableArrayValue(group.items ?? []);
      }
      continue;
    }

    for (const field of group.fields) {
      writeFieldValue(merged, field.jsonPath, field.value);
    }
  }

  return merged;
}

export function ComposableContentForm({
  siteId,
  contentType,
  record,
  previewUrl,
  fieldFormats = {},
  authProvider = 'none',
  showLogout = false,
}: ComposableContentFormProps) {
  const router = useRouter();
  const { readOnly } = useAdminAccess();
  const [groups, setGroups] = useState<ComposableFieldGroup[]>(() =>
    restoreGroupsFromData(record.data ?? {}, createGroupId, fieldFormats),
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');
  const [isPending, setIsPending] = useState(false);

  const sourceData = useMemo(() => record.data ?? {}, [record.data]);

  function handleAddGroup(prefix: string, fields: ComposableFieldRow[], repeatable = false) {
    if (fields.length === 0) {
      return;
    }

    setGroups((current) => [
      ...current,
      {
        id: createGroupId(),
        prefix,
        fields,
        ...(repeatable ? { repeatable: true as const, items: [] } : {}),
      },
    ]);
  }

  function updateGroup(groupId: string, nextGroup: ComposableFieldGroup) {
    setGroups((current) => current.map((group) => (group.id === groupId ? nextGroup : group)));
  }

  function removeGroup(groupId: string) {
    setGroups((current) => current.filter((group) => group.id !== groupId));
  }

  function handleDuplicateGroup(groupId: string) {
    setGroups((current) => {
      const sourceIndex = current.findIndex((group) => group.id === groupId);
      if (sourceIndex === -1) {
        return current;
      }

      const source = current[sourceIndex];
      const newPrefix = nextDuplicatePrefix(
        source.prefix,
        current.map((group) => group.prefix),
      );
      const duplicated = {
        ...duplicateFieldGroup(source, newPrefix),
        id: createGroupId(),
      };

      const next = [...current];
      next.splice(sourceIndex + 1, 0, duplicated);
      return next;
    });
  }

  async function persist(action: 'save' | 'publish') {
    setIsPending(true);
    setStatusMessage('');

    const data = mergeDataForSave(sourceData, groups);
    const body = buildContentWriteBody({
      title: record.title,
      slug: record.slug,
      data,
      status: action === 'publish' ? 'published' : 'draft',
      fieldFormats: collectComposableFieldFormats(groups),
    });

    try {
      const endpoint = `/api/admin/sites/${siteId}/content/${contentType.slug}/${record.id}`;
      const response = await adminFetch<ApiContentRecord>(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error ?? `HTTP ${response.status}`);
      }

      if (action === 'publish') {
        const publishResult = await adminFetch<ApiContentRecord>(
          `/api/admin/sites/${siteId}/content/${contentType.slug}/${record.id}/publish`,
          { method: 'POST' },
        );

        if (!publishResult.ok || !publishResult.data) {
          throw new Error(publishResult.error ?? `HTTP ${publishResult.status}`);
        }
      }

      setStatusKind('success');
      setStatusMessage(action === 'publish' ? '公開しました。' : '下書きを保存しました。');
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '保存に失敗しました。';
      setStatusKind('error');
      setStatusMessage(`API エラー: ${message}`);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section data-l="ContentForm" className="ComposableContentForm space-y-5 overflow-visible text-WH">
      <div>
        <h1 className="text-2xl font-normal text-WH/50 tracking-widest">
          A composable ( headless ) CMS <span className='mx-1 opacity-50 [font-size:0.5em]'>inspired by microCMS.</span>
        </h1>
        <p className="mt-2 text-sm text-GR">
          {readOnly
            ? '閲覧専用です。フィールドの追加・編集はできません。'
            : 'フィールドを追加・保存し、サイトやアプリで取得します。'}
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-4 overflow-visible lg:flex-row lg:items-start lg:gap-6">
        <FieldAddPanel
          sourceData={sourceData}
          onAdd={handleAddGroup}
          readOnly={readOnly}
          previewUrl={previewUrl}
          isPending={isPending}
          onSave={() => void persist('save')}
          onPublish={() => void persist('publish')}
          authProvider={authProvider}
          showLogout={showLogout}
        />

        <div className="min-w-0 flex-1">
          {groups.length === 0 ? (
            <p className="text-sm text-GR">
              フィールドはまだありません。左のパネルから追加してください。
            </p>
          ) : (
            <div className="min-w-0 space-y-4">
              {groups.map((group) => (
                <FieldGroup
                  key={group.id}
                  siteId={siteId}
                  group={group}
                  sourceData={sourceData}
                  onChange={(next) => updateGroup(group.id, next)}
                  onRemove={() => removeGroup(group.id)}
                  onDuplicate={() => handleDuplicateGroup(group.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminActionNotice kind={statusKind} message={statusMessage} />
    </section>
  );
}
