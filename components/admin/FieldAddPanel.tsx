'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  createFieldsFromSelection,
  normalizePrefix,
  previewPathsForSelection,
  validatePrefix,
  type ComposableFieldFormat,
  type ComposableFieldSelection,
} from '@/lib/admin/field-type-catalog';

interface FieldAddPanelProps {
  sourceData: Record<string, unknown>;
  onAdd: (prefix: string, fields: ReturnType<typeof createFieldsFromSelection>) => void;
  readOnly?: boolean;
  siteId: string;
  contentTypeSlug: string;
  previewUrl?: string | null;
  isPending?: boolean;
  onSave?: () => void;
  onPublish?: () => void;
}

const emptySelection: ComposableFieldSelection = {
  title: false,
  text: false,
  image: false,
};

export function FieldAddPanel({
  sourceData,
  onAdd,
  readOnly = false,
  siteId,
  contentTypeSlug,
  previewUrl,
  isPending = false,
  onSave,
  onPublish,
}: FieldAddPanelProps) {
  const [prefix, setPrefix] = useState('');
  const [selection, setSelection] = useState<ComposableFieldSelection>(emptySelection);
  const [format, setFormat] = useState<ComposableFieldFormat>('plain');

  const prefixValidation = useMemo(() => validatePrefix(prefix), [prefix]);
  const previewPaths = useMemo(
    () => previewPathsForSelection(prefix, selection),
    [prefix, selection],
  );
  const hasSelection = selection.title || selection.text || selection.image;
  const canAdd = prefixValidation.valid && hasSelection && !readOnly;

  function toggleType(key: keyof ComposableFieldSelection) {
    setSelection((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleAdd() {
    if (!canAdd) {
      return;
    }

    const normalized = normalizePrefix(prefix);
    const fields = createFieldsFromSelection(normalized, selection, sourceData, format);
    onAdd(normalized, fields);
    setSelection(emptySelection);
  }

  const showFormatChoice = selection.title || selection.text;

  return (
    <div data-l="FieldPanel" className="FieldAddPanel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <h4 className="text-sm font-semibold text-white">JSON Path を追加</h4>

      <label className="field_add_panel_prefix mt-4 block">
        <span className="text-sm font-medium text-white">Path Name</span>
        <input
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          placeholder="例: hero（空でも可）"
          disabled={readOnly}
          readOnly={readOnly}
        />
        {!prefixValidation.valid ? (
          <p className="mt-2 text-sm text-rose-300">{prefixValidation.message}</p>
        ) : null}
      </label>

      <fieldset className="field_add_panel_types mt-4 space-y-2" disabled={readOnly}>
        <legend className="text-sm font-medium text-white">Path の種類</legend>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={selection.title}
            onChange={() => toggleType('title')}
          />
          タイトル
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={selection.text}
            onChange={() => toggleType('text')}
          />
          テキスト
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={selection.image}
            onChange={() => toggleType('image')}
          />
          画像（URL・代替テキスト・リンク先をセット追加）
        </label>
      </fieldset>

      {showFormatChoice ? (
        <fieldset className="field_add_panel_format mt-4 space-y-2" disabled={readOnly}>
          <legend className="text-sm font-medium text-white">タイトル・テキストの形式</legend>
          <label className="flex items-start gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="field_add_format"
              className="mt-1"
              checked={format === 'plain'}
              onChange={() => setFormat('plain')}
            />
            <span>
              プレーンテキスト
              <span className="block text-xs text-slate-400">そのまま文字列として表示（安全）。</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="field_add_format"
              className="mt-1"
              checked={format === 'richText'}
              onChange={() => setFormat('richText')}
            />
            <span>
              リッチテキスト
              <span className="block text-xs text-slate-400">
                太字・斜体・アクセント（span）などインライン装飾を許可。
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      {previewPaths.length > 0 ? (
        <div data-l="PathPreview" className="field_add_panel_preview mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">追加される JSON Path</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-sky-100">
            {previewPaths.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!readOnly ? (
        <button
          type="button"
          className="field_add_panel_submit mt-4 rounded-full bg-sky-400/90 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleAdd}
          disabled={!canAdd}
        >
          追加する
        </button>
      ) : null}

      <div data-l="FormActions" className="field_add_panel_actions mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6">
        {!readOnly ? (
          <>
            <button
              type="button"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onSave?.()}
              disabled={isPending}
            >
              下書きを保存
            </button>
            <button
              type="button"
              className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => onPublish?.()}
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
          href={`/sites/${siteId}/contents/${contentTypeSlug}`}
          className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white"
        >
          一覧に戻る
        </Link>
      </div>
    </div>
  );
}
