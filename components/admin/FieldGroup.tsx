'use client';

import {
  getFieldTypeLabel,
  migratePathsOnPrefixChange,
  validatePrefix,
  type ComposableFieldGroup,
  type ComposableFieldRow,
} from '@/lib/admin/field-type-catalog';

interface FieldGroupProps {
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

function removeImageBundle(fields: ComposableFieldRow[]): ComposableFieldRow[] {
  return fields.filter((field) => field.bundle !== 'image');
}

export function FieldGroup({ group, sourceData, onChange, onRemove, readOnly = false }: FieldGroupProps) {
  const prefixValidation = validatePrefix(group.prefix);

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

  function handleRemoveBundle() {
    onChange({
      ...group,
      fields: removeImageBundle(group.fields),
    });
  }

  const scalarFields = group.fields.filter((field) => field.bundle !== 'image');
  const imageBundleFields = group.fields.filter((field) => field.bundle === 'image');
  const hasImageBundle = imageBundleFields.length > 0;

  return (
    <div className="FieldGroup rounded-2xl border border-white/10 bg-slate-950/30 p-4">
      <div className="field_group_header flex flex-wrap items-start justify-between gap-3">
        <label className="field_group_prefix block min-w-[12rem] flex-1">
          <span className="text-sm font-medium text-white">JSON パス prefix</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
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
        {!readOnly ? (
          <button
            type="button"
            className="field_group_remove rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/20"
            onClick={onRemove}
          >
            グループを削除
          </button>
        ) : null}
      </div>

      <div className="field_group_fields mt-4 space-y-4">
        {scalarFields.map((field) => (
          <div key={field.jsonPath} className="field_group_field">
            <p className="text-xs text-slate-400">
              {getFieldTypeLabel(field.type)} · <span className="font-mono">{field.jsonPath}</span>
            </p>
            {field.type === 'text' ? (
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
        ))}

        {hasImageBundle ? (
          <div className="field_group_image_bundle rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
            <div className="field_group_image_bundle_header flex items-center justify-between gap-3">
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
            <div className="mt-3 space-y-4">
              {imageBundleFields.map((field) => (
                <div key={field.jsonPath} className="field_group_bundle_field">
                  <p className="text-xs text-slate-400">
                    {getFieldTypeLabel(field.type)} ·{' '}
                    <span className="font-mono">{field.jsonPath}</span>
                  </p>
                  <input
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                    type={field.type === 'imageUrl' || field.type === 'href' ? 'url' : 'text'}
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
    </div>
  );
}
