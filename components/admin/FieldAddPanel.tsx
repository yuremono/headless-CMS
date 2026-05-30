'use client';

import { useMemo, useState } from 'react';
import type { CmsAuthProvider } from '@/lib/auth/production-config';
import { LogoutButton } from './LogoutButton';
import {
  adminBtnAction,
  adminBtnPrimary,
  adminBtnPublish,
  adminBtnViolet,
  adminFieldControl,
  adminPanel,
  adminPanelInset,
} from './admin-ui-classes';
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
  onAdd: (
    prefix: string,
    fields: ReturnType<typeof createFieldsFromSelection>,
    repeatable?: boolean,
  ) => void;
  readOnly?: boolean;
  previewUrl?: string | null;
  isPending?: boolean;
  onSave?: () => void;
  onPublish?: () => void;
  authProvider?: CmsAuthProvider;
  showLogout?: boolean;
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
  previewUrl,
  isPending = false,
  onSave,
  onPublish,
  authProvider = 'none',
  showLogout = false,
}: FieldAddPanelProps) {
  const [prefix, setPrefix] = useState('');
  const [selection, setSelection] = useState<ComposableFieldSelection>(emptySelection);
  const [format, setFormat] = useState<ComposableFieldFormat>('plain');
  const [repeatable, setRepeatable] = useState(false);

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
    onAdd(normalized, fields, repeatable);
    setSelection(emptySelection);
    setRepeatable(false);
  }

  const showFormatChoice = selection.title || selection.text;

  return (
    <div
      data-l="FieldPanel"
      className={`FieldAddPanel ${adminPanel} p-4 lg:sticky lg:top-0 lg:w-72 lg:max-w-full lg:shrink-0 lg:self-start`}
    >
      <h4 className="text-sm font-semibold text-WH">フィールドを追加</h4>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-WH">Field name</span>
        <input
          className={adminFieldControl}
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          placeholder="例: hero"
          disabled={readOnly}
          readOnly={readOnly}
        />
        {!prefixValidation.valid ? (
          <p className="mt-2 text-sm text-AC">{prefixValidation.message}</p>
        ) : null}
      </label>

      <fieldset className="mt-4 space-y-2" disabled={readOnly}>
        <legend className="text-sm font-medium text-WH">Field Path</legend>
        <label className="flex items-center gap-2 text-sm text-WH">
          <input
            type="checkbox"
            checked={selection.title}
            onChange={() => toggleType('title')}
          />
          タイトル
        </label>
        <label className="flex items-center gap-2 text-sm text-WH">
          <input
            type="checkbox"
            checked={selection.text}
            onChange={() => toggleType('text')}
          />
          テキスト
        </label>
        <label className="flex items-center gap-2 text-sm text-WH">
          <input
            type="checkbox"
            checked={selection.image}
            onChange={() => toggleType('image')}
          />
          画像（URL・代替テキスト・リンク先をセット追加）
        </label>
        <label className="flex items-start gap-2 text-sm text-WH">
          <input
            type="checkbox"
            className="mt-1"
            checked={repeatable}
            onChange={() => setRepeatable((current) => !current)}
          />
          <span>
            繰り返し（配列）
            <span className="block text-xs text-GR">
              同一構成の要素を JSON 配列として保存します（例: cards[]）。
            </span>
          </span>
        </label>
      </fieldset>

      {showFormatChoice ? (
        <fieldset className="mt-4 space-y-2" disabled={readOnly}>
          <legend className="text-sm font-medium text-WH">タイトル・テキストの形式</legend>
          <label className="flex items-start gap-2 text-sm text-WH">
            <input
              type="radio"
              name="field_add_format"
              className="mt-1"
              checked={format === 'plain'}
              onChange={() => setFormat('plain')}
            />
            <span>
              プレーンテキスト
              <span className="block text-xs text-GR">そのまま文字列として表示（安全）。</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-WH">
            <input
              type="radio"
              name="field_add_format"
              className="mt-1"
              checked={format === 'richText'}
              onChange={() => setFormat('richText')}
            />
            <span>
              リッチテキスト
              <span className="block text-xs text-GR">
                太字・斜体・アクセント（span）などインライン装飾を許可。
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      {previewPaths.length > 0 ? (
        <div
          data-l="PathPreview"
          className={`mt-4 ${adminPanelInset} p-3`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-GR">追加されるフィールドパス</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-WH">
            {previewPaths.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!readOnly ? (
        <button
          type="button"
          className={`mt-4 ${adminBtnAction}`}
          onClick={handleAdd}
          disabled={!canAdd}
        >
          追加する
        </button>
      ) : null}

      <div
        data-l="FormActions"
        className="mt-6 flex flex-wrap gap-3 border-t border-WH/20 pt-6"
      >
        {!readOnly ? (
          <>
            <button
              type="button"
              className={adminBtnPrimary}
              onClick={() => onSave?.()}
              disabled={isPending}
            >
              下書きを保存
            </button>
            <button
              type="button"
              className={adminBtnPublish}
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
            className={adminBtnPrimary}
            >
              プレビューを開く
            </a>
        ) : null}
        {/* 一覧に戻る ボタンはトップページでは非表示 */}
      </div>
      {showLogout ? (
        <div className="mt-4 border-t border-WH/20 pt-4">
          <LogoutButton authProvider={authProvider} />
        </div>
      ) : null}
    </div>
  );
}
