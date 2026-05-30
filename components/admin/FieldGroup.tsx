'use client';

import type { MouseEvent } from 'react';
import {
  getFieldTypeLabel,
  migratePathsOnPrefixChange,
  supportsFormat,
  validatePrefix,
  type ComposableFieldFormat,
  type ComposableFieldGroup,
  type ComposableFieldRow,
} from '@/lib/admin/field-type-catalog';
import { ImageFieldInput } from './ImageFieldInput';
import { RichInlineEditor } from './RichInlineEditor';
import type { ImageFieldValue } from './admin-api';

interface FieldGroupProps {
  siteId: string;
  group: ComposableFieldGroup;
  sourceData: Record<string, unknown>;
  onChange: (group: ComposableFieldGroup) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

function updateFieldRow(
  fields: ComposableFieldRow[],
  jsonPath: string,
  value: string,
): ComposableFieldRow[] {
  return fields.map((field) => (field.jsonPath === jsonPath ? { ...field, value } : field));
}

function updateFieldFormat(
  fields: ComposableFieldRow[],
  jsonPath: string,
  format: ComposableFieldFormat,
): ComposableFieldRow[] {
  return fields.map((field) => (field.jsonPath === jsonPath ? { ...field, format } : field));
}

function removeImageBundle(fields: ComposableFieldRow[]): ComposableFieldRow[] {
  return fields.filter((field) => field.bundle !== 'image');
}

function applyImageFieldValue(
  fields: ComposableFieldRow[],
  nextValue: ImageFieldValue,
): ComposableFieldRow[] {
  return fields.map((field) => {
    if (field.type === 'imageUrl') {
      return { ...field, value: nextValue.url };
    }
    if (field.type === 'imageAlt') {
      return { ...field, value: nextValue.alt };
    }
    return field;
  });
}

function isInteractiveSummaryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest('input, button, textarea, select, a, [contenteditable="true"]'),
  );
}

export function FieldGroup({
  siteId,
  group,
  sourceData,
  onChange,
  onRemove,
  readOnly = false,
}: FieldGroupProps) {
  const prefixValidation = validatePrefix(group.prefix);

  function handleSummaryClick(event: MouseEvent<HTMLElement>) {
    if (isInteractiveSummaryTarget(event.target)) {
      event.preventDefault();
    }
  }

  function handlePrefixChange(nextPrefix: string) {
    const migratedFields = migratePathsOnPrefixChange(
      group.prefix,
      nextPrefix,
      group.fields,
      sourceData,
    );

    onChange({
      ...group,
      prefix: nextPrefix,
      fields: migratedFields,
    });
  }

  function handleFieldChange(jsonPath: string, value: string) {
    onChange({
      ...group,
      fields: updateFieldRow(group.fields, jsonPath, value),
    });
  }

  function handleFormatChange(jsonPath: string, format: ComposableFieldFormat) {
    onChange({
      ...group,
      fields: updateFieldFormat(group.fields, jsonPath, format),
    });
  }

  function handleRemoveBundle() {
    onChange({
      ...group,
      fields: removeImageBundle(group.fields),
    });
  }

  const scalarFields = group.fields.filter((field) => field.bundle !== 'image');
  const imageBundleFields = group.fields.filter((field) => field.bundle === 'image');
  const hasImageBundle = imageBundleFields.length > 0;
  const imageUrlField = imageBundleFields.find((field) => field.type === 'imageUrl');
  const imageAltField = imageBundleFields.find((field) => field.type === 'imageAlt');
  const imageHrefFields = imageBundleFields.filter((field) => field.type === 'href');
  const imageFieldValue: ImageFieldValue = {
    url: String(imageUrlField?.value ?? ''),
    alt: String(imageAltField?.value ?? ''),
  };

  return (
    <details
      data-l="FieldGroup"
      className="FieldGroup rounded-2xl border border-white/10 bg-slate-950/30 p-4"
      open
      aria-label={`フィールドグループ: ${group.prefix || '（prefix 未入力）'}`}
    >
      <summary
        data-l="GroupHeader"
        className="field_group_header flex flex-wrap items-center gap-3"
        onClick={handleSummaryClick}
      >
        <span className="field_group_toggle" aria-hidden="true">
          <svg
            className="field_group_toggle_icon"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <div
          data-l="PrefixRow"
          className="field_group_prefix_row flex min-w-[12rem] flex-1 flex-row items-center gap-3"
        >
          <span className="field_group_prefix_label shrink-0  text-sm font-medium text-white">
            Path Name
          </span>
          <label className="field_group_prefix min-w-0 flex-1">
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
              value={group.prefix}
              onChange={(event) => handlePrefixChange(event.target.value)}
              placeholder="例: hero"
              disabled={readOnly}
              readOnly={readOnly}
            />
            {!prefixValidation.valid ? (
              <p className="mt-2 text-sm text-rose-300">{prefixValidation.message}</p>
            ) : null}
          </label>
        </div>
        {!readOnly ? (
          <button
            type="button"
            className="field_group_remove rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
            onClick={(event) => {
              event.preventDefault();
              onRemove();
            }}
          >
            JSONを削除
          </button>
        ) : null}
      </summary>

      <div data-l="GroupFields" className="field_group_fields mt-4 space-y-4">
        {scalarFields.map((field, fieldIndex) => {
          const isRich = supportsFormat(field.type) && field.format === 'richText';

          return (
            <div key={field.jsonPath} data-l={`FieldItem${fieldIndex + 1}`} className="field_group_field">
              <div data-l="FieldHeader" className="field_group_field_header flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  {getFieldTypeLabel(field.type)} · <span className="font-mono">{field.jsonPath}</span>
                </p>
                {supportsFormat(field.type) && !readOnly ? (
                  <div
                    data-l="FormatToggle"
                    className="field_group_field_format flex items-center gap-1 text-xs"
                    role="group"
                    aria-label="形式"
                  >
                    <button
                      type="button"
                      className={`rounded-md border px-2 py-0.5 transition ${
                        !isRich
                          ? 'border-sky-400/60 bg-sky-400/15 text-sky-100'
                          : 'border-white/15 text-slate-300 hover:bg-slate-800'
                      }`}
                      onClick={() => handleFormatChange(field.jsonPath, 'plain')}
                    >
                      プレーン
                    </button>
                    <button
                      type="button"
                      className={`rounded-md border px-2 py-0.5 transition ${
                        isRich
                          ? 'border-sky-400/60 bg-sky-400/15 text-sky-100'
                          : 'border-white/15 text-slate-300 hover:bg-slate-800'
                      }`}
                      onClick={() => handleFormatChange(field.jsonPath, 'richText')}
                    >
                      リッチ
                    </button>
                  </div>
                ) : null}
              </div>
              {isRich ? (
                <RichInlineEditor
                  value={String(field.value ?? '')}
                  onChange={(html) => handleFieldChange(field.jsonPath, html)}
                  readOnly={readOnly}
                  ariaLabel={field.jsonPath}
                />
              ) : field.type === 'text' ? (
                <textarea
                  className="mt-2 min-h-[8rem] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                  value={String(field.value ?? '')}
                  onChange={(event) => handleFieldChange(field.jsonPath, event.target.value)}
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              ) : (
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                  type={field.type === 'imageUrl' || field.type === 'href' ? 'url' : 'text'}
                  value={String(field.value ?? '')}
                  onChange={(event) => handleFieldChange(field.jsonPath, event.target.value)}
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              )}
            </div>
          );
        })}

        {hasImageBundle ? (
          <div data-l="ImageBundle" className="field_group_image_bundle rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
            <div data-l="BundleHeader" className="field_group_image_bundle_header flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-violet-100">画像セット</p>
              {!readOnly ? (
                <button
                  type="button"
                  className="field_group_bundle_remove rounded-full border border-violet-400/40 px-3 py-1 text-xs text-violet-100 transition hover:bg-violet-400/10"
                  onClick={handleRemoveBundle}
                >
                  画像セットを削除
                </button>
              ) : null}
            </div>
            <div data-l="BundleFields" className="mt-3 space-y-4">
              {imageUrlField ? (
                <div data-l="BundleImage" className="field_group_bundle_image">
                  <p className="text-xs text-slate-400">
                    {getFieldTypeLabel('imageUrl')} ·{' '}
                    <span className="font-mono">{imageUrlField.jsonPath}</span>
                    {imageAltField ? (
                      <>
                        {' '}
                        / <span className="font-mono">{imageAltField.jsonPath}</span>
                      </>
                    ) : null}
                  </p>
                  <ImageFieldInput
                    siteId={siteId}
                    label="画像"
                    value={imageFieldValue}
                    onChange={(nextValue) => {
                      onChange({
                        ...group,
                        fields: applyImageFieldValue(group.fields, nextValue),
                      });
                    }}
                    readOnly={readOnly}
                  />
                </div>
              ) : null}
              {imageHrefFields.map((field, hrefIndex) => (
                <div key={field.jsonPath} data-l={`BundleField${hrefIndex + 1}`} className="field_group_bundle_field">
                  <p className="text-xs text-slate-400">
                    {getFieldTypeLabel(field.type)} ·{' '}
                    <span className="font-mono">{field.jsonPath}</span>
                  </p>
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                    type="url"
                    value={String(field.value ?? '')}
                    onChange={(event) => handleFieldChange(field.jsonPath, event.target.value)}
                    disabled={readOnly}
                    readOnly={readOnly}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}
