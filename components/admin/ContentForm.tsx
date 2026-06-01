'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAccess } from './AdminAccessContext';
import { AdminActionNotice } from './AdminActionNotice';
import { adminFetch, buildContentWriteBody, formatFieldDraftValue, getFieldKey, mapApiContentRecord, readFieldValue, writeFieldValue, type ApiContentRecord, type FieldDraftValue, type ImageFieldValue } from './admin-api';
import { FieldRenderer } from './FieldRenderer';
import {
  buildSeoPayloadFromDraft,
  isSeoFieldKey,
  readSeoDraftFromData,
  SeoFields,
} from './SeoFields';
import type { ContentRecord, ContentTypeDefinition } from './admin-data-types';

interface ContentFormProps {
  siteId: string;
  contentType: ContentTypeDefinition;
  record: ContentRecord | null;
  mode: 'create' | 'edit';
  previewUrl?: string | null;
}

function buildInitialState(contentType: ContentTypeDefinition, record: ContentRecord | null) {
  const draft: Record<string, FieldDraftValue> = {};
  const data = record?.data ?? {};

  for (const field of contentType.schemaJson.fields) {
    const fieldKey = getFieldKey(field);
    draft[fieldKey] = formatFieldDraftValue(readFieldValue(data, fieldKey), field.type);
  }

  if (record) {
    draft.title = record.title;
    draft.slug = record.slug;
  }

  const seoDraft = readSeoDraftFromData(data);
  for (const [key, value] of Object.entries(seoDraft)) {
    draft[key] = value;
  }

  return draft;
}

function normalizePayload(contentType: ContentTypeDefinition, draft: Record<string, FieldDraftValue>) {
  const data = contentType.schemaJson.fields.reduce<Record<string, unknown>>((acc, field) => {
    const fieldKey = getFieldKey(field);

    if (isSeoFieldKey(fieldKey)) {
      return acc;
    }

    const value = draft[fieldKey];

    if (field.type === 'boolean') {
      writeFieldValue(acc, fieldKey, Boolean(value));
      return acc;
    }

    if (field.type === 'number') {
      writeFieldValue(acc, fieldKey, value === '' ? null : Number(value));
      return acc;
    }

    if (field.type === 'image') {
      const imageValue =
        value && typeof value === 'object' && 'url' in value
          ? (value as ImageFieldValue)
          : { url: String(value ?? ''), alt: '' };

      writeFieldValue(acc, fieldKey, {
        url: imageValue.url.trim(),
        alt: imageValue.alt.trim(),
      });
      return acc;
    }

    if (field.type === 'sectionArray') {
      try {
        writeFieldValue(acc, fieldKey, value ? JSON.parse(String(value)) : []);
      } catch {
        writeFieldValue(acc, fieldKey, value);
      }
      return acc;
    }

    writeFieldValue(acc, fieldKey, value);
    return acc;
  }, {});

  data.seo = buildSeoPayloadFromDraft(draft);
  return data;
}

export function ContentForm({ siteId, contentType, record, mode, previewUrl }: ContentFormProps) {
  const router = useRouter();
  const { readOnly } = useAdminAccess();
  const initialState = useMemo(() => buildInitialState(contentType, record), [contentType, record]);
  const [draft, setDraft] = useState<Record<string, FieldDraftValue>>(initialState);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setDraft(initialState);
  }, [initialState]);

  function updateField(key: string, value: FieldDraftValue) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function persist(action: 'save' | 'publish') {
    if (readOnly) {
      setStatusKind("error");
      setStatusMessage("");
      window.setTimeout(() => setStatusMessage("編集権限がありません。"), 0);
      return;
    }

    setIsPending(true);
    setStatusMessage('');

    const title = String(draft.title ?? '');
    const slug = String(draft.slug ?? '');
    const data = normalizePayload(contentType, draft);
    const body = buildContentWriteBody({ title, slug, data, status: action === 'publish' ? 'published' : 'draft' });

    try {
		const endpoint =
			mode === "create"
				? `/api/admin/sites/${siteId}/content/${contentType.slug}`
				: `/api/admin/sites/${siteId}/content/${contentType.slug}?id=${encodeURIComponent(record?.id ?? "")}`;

		const method = mode === "create" ? "POST" : "PATCH";
		const response = await adminFetch<ApiContentRecord>(endpoint, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!response.ok || !response.data) {
			throw new Error(response.error ?? `HTTP ${response.status}`);
		}

		const saved = mapApiContentRecord(response.data);

		setStatusKind("success");
		setStatusMessage(
			action === "publish" ? "公開しました" : "下書きを保存しました",
		);

		if (mode === "create") {
			router.push(
				`/sites/${siteId}/contents/${contentType.slug}/${saved.id}`,
			);
			return;
		}

		router.refresh();
	} catch (cause) {
		const message =
			cause instanceof Error ? cause.message : "保存に失敗しました";
		setStatusKind("error");
		setStatusMessage(`API エラー: ${message}`);
	} finally {
		setIsPending(false);
	}
  }

  return (
		<section className="ContentForm space-y-5  border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div>
					<p className="text-xs uppercase tracking-widest text-slate-400">
						{contentType.kind}
					</p>
					<h3 className="mt-2 text-2xl font-semibold text-white">
						{readOnly
							? `${contentType.label} を編集`
							: mode === "create"
								? `${contentType.label} を新規作成`
								: `${contentType.label} を編集`}
					</h3>
					<p className="mt-2 text-sm text-slate-300">
						{readOnly
							? "閲覧専用です。入力内容は保存・公開されません。"
							: "スキーマに従ってフィールドを自動生成しています。"}
					</p>
				</div>
				<div className="flex items-center gap-3 text-sm text-slate-300">
					<span className="rounded-full border border-white/10 px-3 py-1">
						{contentType.schemaJson.fields.length} fields
					</span>
					<span className="rounded-full border border-white/10 px-3 py-1">
						{contentType.schemaJson.sectionTemplates?.length ?? 0}{" "}
						templates
					</span>
				</div>
			</div>

			{!readOnly ? (
				<div className="rounded-md border border-sky-400/20 bg-sky-400/5 p-4 text-sm text-sky-100">
					下書き保存・公開は管理 API へ POST / PATCH / publish
					を送信します。`x-session-token` が必要です。
				</div>
			) : null}

			<div className="grid gap-5 lg:grid-cols-2">
				<label className="block">
					<span className="text-sm font-medium text-white">
						タイトル
					</span>
					<input
						className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
						value={String(draft.title ?? "")}
						onChange={(event) =>
							updateField("title", event.target.value)
						}
						placeholder="タイトルを入力"
					/>
				</label>
				<label className="block">
					<span className="text-sm font-medium text-white">
						スラッグ
					</span>
					<input
						className="mt-2 w-full rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
						value={String(draft.slug ?? "")}
						onChange={(event) =>
							updateField("slug", event.target.value)
						}
						placeholder="slug"
					/>
				</label>
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				{contentType.schemaJson.fields
					.filter((field) => {
						const fieldKey = getFieldKey(field);
						return (
							fieldKey !== "title" &&
							fieldKey !== "slug" &&
							!isSeoFieldKey(fieldKey)
						);
					})
					.map((field) => {
						const fieldKey = getFieldKey(field);
						return (
							<FieldRenderer
								key={fieldKey}
								siteId={siteId}
								field={field}
								value={draft[fieldKey] ?? ""}
								sectionTemplates={
									contentType.schemaJson.sectionTemplates
								}
								onChange={updateField}
								readOnly={false}
								disablePersistentActions={readOnly}
							/>
						);
					})}
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				<SeoFields
					draft={draft}
					onChange={updateField}
					readOnly={false}
				/>
			</div>

			<AdminActionNotice kind={statusKind} message={statusMessage} />

			<div className="flex flex-wrap gap-3">
				<button
					type="button"
					className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
					onClick={() => void persist("save")}
					disabled={isPending}
				>
					下書きを保存
				</button>
				<button
					type="button"
					className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
					onClick={() => void persist("publish")}
					disabled={isPending || mode === "create"}
				>
					公開
				</button>
				{mode === "edit" && previewUrl ? (
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
