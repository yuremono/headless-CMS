'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { CmsAuthProvider } from '@/lib/auth/production-config';
import { LogoutButton } from './LogoutButton';
import {
  adminFieldControl,
  adminBtnLg,
  adminBtnSm,
  adminPanel,
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
  previewUrl?: string | null;
  isPending?: boolean;
  onSave?: () => void;
  onPublish?: () => void;
  authProvider?: CmsAuthProvider;
  showLogout?: boolean;
  existingPrefixes?: string[];
  actionNotice?: ReactNode;
}

const emptySelection: ComposableFieldSelection = {
  title: false,
  text: false,
  image: false,
};

export function FieldAddPanel({
  sourceData,
  onAdd,
  previewUrl,
  isPending = false,
  onSave,
  onPublish,
  authProvider = 'none',
  showLogout = false,
  existingPrefixes = [],
  actionNotice,
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
  const normalizedPrefix = normalizePrefix(prefix);
  const isDuplicatePrefix = normalizedPrefix.length > 0 && existingPrefixes.includes(normalizedPrefix);
  const canAdd = prefixValidation.valid && !isDuplicatePrefix && hasSelection;

  function toggleType(key: keyof ComposableFieldSelection) {
    setSelection((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleAdd() {
    if (!canAdd) {
      return;
    }

    const fields = createFieldsFromSelection(normalizedPrefix, selection, sourceData, format);
    onAdd(normalizedPrefix, fields, repeatable);
    setPrefix('');
    setSelection(emptySelection);
    setRepeatable(false);
  }

  const showFormatChoice = selection.title || selection.text;

  return (
    <div
      data-l="FieldPanel"
      className={`FieldAddPanel p-4 p border border-TC/20 lg:w-72 lg:max-w-full lg:shrink-0 lg:self-start`}
    >
      <h4 className="text-sm font-semibold">フィールドを追加</h4>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-GR">Field name</span>
        <input
          className={adminFieldControl}
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          placeholder="例: hero"
        />
        {!prefixValidation.valid ? (
          <p className="mt-2 text-sm text-AC">{prefixValidation.message}</p>
        ) : null}
        {isDuplicatePrefix ? (
          <p className="mt-2 text-sm text-AC">同じ Field name はすでに存在します。</p>
        ) : null}
      </label>

      <fieldset className="mt-4 space-y-2">
        <legend className="text-sm font-medium text-GR">Field Path</legend>
        <label className="flex items-center gap-2 text-sm text-GR">
          <input
            type="checkbox"
            className="accent-SC"
            checked={selection.title}
            onChange={() => toggleType('title')}
          />
          タイトル
        </label>
        <label className="flex items-center gap-2 text-sm text-GR">
          <input
            type="checkbox"
            className="accent-SC"
            checked={selection.text}
            onChange={() => toggleType('text')}
          />
          テキスト
        </label>
        <label className="flex items-center gap-2 text-sm text-GR">
          <input
            type="checkbox"
            className="accent-SC"
            checked={selection.image}
            onChange={() => toggleType('image')}
          />
          画像（URL・代替テキスト・リンク先をセット追加）
        </label>
        <label className="flex items-start gap-2 text-sm text-GR">
          <input
            type="checkbox"
            className="mt-1 accent-SC"
            checked={repeatable}
            onChange={() => setRepeatable((current) => !current)}
          />
          <span>
            繰り返し（配列）
            <span className="block text-xs text-GR/80">
              同一構成の要素を JSON 配列として保存します（例: cards[]）。
            </span>
          </span>
        </label>
      </fieldset>

      {showFormatChoice ? (
        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-GR">タイトル・テキストの形式</legend>
          <label className="flex items-start gap-2 text-sm text-GR">
            <input
              type="radio"
              name="field_add_format"
              className="mt-1 accent-SC"
              checked={format === 'plain'}
              onChange={() => setFormat('plain')}
            />
            <span>
              プレーンテキスト
              <span className="block text-xs text-GR/80">そのまま文字列として表示（安全）。</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-GR">
            <input
              type="radio"
              name="field_add_format"
              className="mt-1 accent-SC"
              checked={format === 'richText'}
              onChange={() => setFormat('richText')}
            />
            <span>
              リッチテキスト
              <span className="block text-xs text-GR/80">
                太字・斜体・アクセント（span）などインライン装飾を許可。
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      {previewPaths.length > 0 ? (
        <div
          data-l="PathPreview"
          className="mt-4 rounded-md border border-SC/20 p-3"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-GR">追加されるフィールドパス</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {previewPaths.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        className={`mt-4 ${adminBtnSm}`}
        onClick={handleAdd}
        disabled={!canAdd}
      >
        追加する
      </button>

      <div className="mt-4 space-y-3 border-t border-TC/20 pt-4">
        {actionNotice}
        <div data-l="FormActions" className="flex flex-wrap gap-3">
        <button
          type="button"
          className={adminBtnLg}
          onClick={() => onSave?.()}
          disabled={isPending}
        >
          下書きを保存
        </button>
        <button
          type="button"
          className={adminBtnLg}
          onClick={() => onPublish?.()}
          disabled={isPending}
        >
          公開
        </button>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={adminBtnLg}
            >
              プレビューを開く
            </a>
        ) : null}
        {/* 一覧に戻る ボタンはトップページでは非表示 */}
        </div>
      </div>
      {showLogout ? (
        <div className="mt-4 border-t border-TC/20 pt-4">
          <LogoutButton authProvider={authProvider} />
        </div>
      ) : null}
    </div>
  );
}
