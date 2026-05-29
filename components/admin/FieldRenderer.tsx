'use client';

import { getFieldKey } from './admin-api';
import type { FieldDefinition } from './admin-data-types';
import type { FieldDraftValue, ImageFieldValue } from './admin-api';
import { ImageFieldInput } from './ImageFieldInput';
import { SectionEditor } from './SectionEditor';

interface FieldRendererProps {
  siteId: string;
  field: FieldDefinition;
  value: FieldDraftValue;
  sectionTemplates?: string[];
  onChange: (key: string, value: FieldDraftValue) => void;
}

function isImageFieldValue(value: FieldDraftValue): value is ImageFieldValue {
  return typeof value === 'object' && value !== null && 'url' in value && 'alt' in value;
}

export function FieldRenderer({ siteId, field, value, sectionTemplates, onChange }: FieldRendererProps) {
  const fieldKey = getFieldKey(field);
  const baseClass =
    'mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20';

  const label = (
    <div className="flex items-center gap-2 text-sm font-medium text-white">
      <span>{field.label}</span>
      {field.required ? <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs text-sky-200">必須</span> : null}
    </div>
  );

  if (field.type === 'sectionArray') {
    const sectionValue =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value
        : JSON.stringify(value ?? '');

    return (
      <SectionEditor
        label={field.label}
        value={sectionValue}
        sectionTemplates={sectionTemplates}
        helpText={field.helpText}
        onChange={(nextValue) => onChange(fieldKey, nextValue)}
      />
    );
  }

  if (field.type === 'image') {
    const imageValue = isImageFieldValue(value) ? value : { url: String(value ?? ''), alt: '' };

    return (
      <ImageFieldInput
        siteId={siteId}
        label={field.label}
        required={field.required}
        helpText={field.helpText}
        value={imageValue}
        onChange={(nextValue) => onChange(fieldKey, nextValue)}
      />
    );
  }

  return (
    <label className="FieldRenderer block">
      {label}
      {field.type === 'textarea' || field.type === 'richText' ? (
        <textarea
          className={baseClass}
          rows={field.rows ?? (field.type === 'richText' ? 10 : 5)}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(fieldKey, event.target.value)}
        />
      ) : field.type === 'boolean' ? (
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-left text-sm text-white"
          onClick={() => onChange(fieldKey, !Boolean(value))}
        >
          <span>{Boolean(value) ? 'ON' : 'OFF'}</span>
          <span className={`rounded-full px-3 py-1 text-xs ${Boolean(value) ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
            {Boolean(value) ? '有効' : '無効'}
          </span>
        </button>
      ) : field.type === 'select' ? (
        <select
          className={baseClass}
          value={String(value ?? '')}
          onChange={(event) => onChange(fieldKey, event.target.value)}
        >
          <option value="">選択してください</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={baseClass}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          inputMode={field.type === 'number' ? 'decimal' : undefined}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(fieldKey, field.type === 'number' ? event.target.value : event.target.value)}
        />
      )}
      {field.helpText ? <p className="mt-2 text-xs leading-5 text-slate-400">{field.helpText}</p> : null}
    </label>
  );
}
