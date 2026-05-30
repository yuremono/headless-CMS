'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  restoreGroupsFromData,
  type ComposableFieldGroup,
  type ComposableFieldRow,
} from '@/lib/admin/field-type-catalog';

interface ComposableContentFormProps {
  siteId: string;
  contentType: ContentTypeDefinition;
  record: ContentRecord;
  previewUrl?: string | null;
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
}: ComposableContentFormProps) {
  const router = useRouter();
  const { readOnly } = useAdminAccess();
  const [groups, setGroups] = useState<ComposableFieldGroup[]>(() =>
    restoreGroupsFromData(record.data ?? {}, createGroupId),
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');
  const [isPending, setIsPending] = useState(false);

  const sourceData = useMemo(() => record.data ?? {}, [record.data]);

  function handleAddGroup(prefix: string, fields: ComposableFieldRow[]) {
    if (fields.length === 0) {
      return;
    }

    setGroups((current) => [
      ...current,
      {
        id: createGroupId(),
        prefix,
        fields,
      },
    ]);
  }

  function updateGroup(groupId: string, nextGroup: ComposableFieldGroup) {
    setGroups((current) => current.map((group) => (group.id === groupId ? nextGroup : group)));
  }

  function removeGroup(groupId: string) {
    setGroups((current) => current.filter((group) => group.id !== groupId));
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
    <section className="ComposableContentForm space-y-5 border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{contentType.kind}</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">ページ名</h3>
        <p className="mt-2 text-sm text-slate-300">
          {readOnly
            ? '閲覧専用です。フィールドの追加・編集はできません。'
            : 'prefix とフィールド型を選んでグループを追加し、JSON パスへ値を保存します。'}
        </p>
      </div>

      {!readOnly ? (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 text-sm text-sky-100">
          下書き保存・公開は管理 API へ PATCH / publish を送信します。`x-session-token` が必要です。
        </div>
      ) : null}

      <FieldAddPanel sourceData={sourceData} onAdd={handleAddGroup} readOnly={readOnly} />

      {groups.length === 0 ? (
        <p className="composable_content_form_empty text-sm text-slate-400">
          フィールドグループはまだありません。上のパネルから追加してください。
        </p>
      ) : (
        <div className="composable_content_form_groups space-y-4">
          {groups.map((group) => (
            <FieldGroup
              key={group.id}
              siteId={siteId}
              group={group}
              sourceData={sourceData}
              onChange={(next) => updateGroup(group.id, next)}
              onRemove={() => removeGroup(group.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      <AdminActionNotice kind={statusKind} message={statusMessage} />

      <div className="flex flex-wrap gap-3">
        {!readOnly ? (
          <>
            <button
              type="button"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void persist('save')}
              disabled={isPending}
            >
              下書きを保存
            </button>
            <button
              type="button"
              className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void persist('publish')}
              disabled={isPending}
            >
              公開
            </button>
          </>
        ) : null}
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="PreviewLink rounded-full border border-violet-400/40 bg-violet-400/10 px-5 py-3 text-sm font-medium text-violet-100 transition hover:bg-violet-400/20"
          >
            プレビューを開く
          </a>
        ) : null}
        <Link
          href={`/sites/${siteId}/contents/${contentType.slug}`}
          className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white"
        >
          一覧に戻る
        </Link>
      </div>
    </section>
  );
}
