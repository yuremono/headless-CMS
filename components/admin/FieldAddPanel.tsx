'use client';

import { useMemo, useState } from 'react';
import {
  createFieldsFromSelection,
  normalizePrefix,
  previewPathsForSelection,
  validatePrefix,
  type ComposableFieldSelection,
} from '@/lib/admin/field-type-catalog';

interface FieldAddPanelProps {
  sourceData: Record<string, unknown>;
  onAdd: (prefix: string, fields: ReturnType<typeof createFieldsFromSelection>) => void;
  readOnly?: boolean;
}

const emptySelection: ComposableFieldSelection = {
  title: false,
  text: false,
  image: false,
};

export function FieldAddPanel({ sourceData, onAdd, readOnly = false }: FieldAddPanelProps) {
  const [prefix, setPrefix] = useState('');
  const [selection, setSelection] = useState<ComposableFieldSelection>(emptySelection);

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
    const fields = createFieldsFromSelection(normalized, selection, sourceData);
    onAdd(normalized, fields);
    setSelection(emptySelection);
  }

  return (
    <div className="FieldAddPanel rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <h4 className="text-sm font-semibold text-white">フィールドを追加</h4>

      <label className="field_add_panel_prefix mt-4 block">
        <span className="text-sm font-medium text-white">JSON パス prefix</span>
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
        <legend className="text-sm font-medium text-white">フィールド型</legend>
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

      {previewPaths.length > 0 ? (
        <div className="field_add_panel_preview mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">追加されるパス</p>
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
          フィールドを追加
        </button>
      ) : null}
    </div>
  );
}
