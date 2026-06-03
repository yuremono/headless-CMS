'use client';

import { getFieldKey } from '@/components/admin-data/admin-api';
import type { FieldDefinition } from '@/components/admin-data/admin-data-types';
import type { FieldDraftValue, ImageFieldValue } from '@/components/admin-data/admin-api';
import { ImageFieldInput } from '@/components/media-library/ImageFieldInput';

interface FieldRendererProps {
  siteId: string;
  field: FieldDefinition;
  value: FieldDraftValue;
  sectionTemplates?: string[];
  onChange: (key: string, value: FieldDraftValue) => void;
  readOnly?: boolean;
  disablePersistentActions?: boolean;
}

function isImageFieldValue(value: FieldDraftValue): value is ImageFieldValue {
  return typeof value === 'object' && value !== null && 'url' in value && 'alt' in value;
}

export function FieldRenderer({ siteId, field, value, sectionTemplates, onChange, readOnly = false, disablePersistentActions = false }: FieldRendererProps) {
  const fieldKey = getFieldKey(field);
  const baseClass =
		"mt-2 w-full rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20";

  const label = (
    <div className="flex items-center gap-2 text-sm font-medium text-white">
      <span>{field.label}</span>
      {field.required ? <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs text-sky-200">必須</span> : null}
    </div>
  );


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
        readOnly={readOnly}
        disableUpload={disablePersistentActions}
      />
    );
  }

  return (
		<label className="FieldRenderer block">
			{label}
			{field.type === "textarea" || field.type === "richText" ? (
				<textarea
					className={baseClass}
					rows={field.rows ?? (field.type === "richText" ? 10 : 5)}
					placeholder={field.placeholder}
					value={String(value ?? "")}
					onChange={(event) => onChange(fieldKey, event.target.value)}
					disabled={readOnly}
					readOnly={readOnly}
				/>
			) : field.type === "boolean" ? (
				readOnly ? (
					<p className="mt-2 rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
						{Boolean(value) ? "有効" : "無効"}
					</p>
				) : (
					<button
						type="button"
						className="mt-2 flex w-full items-center justify-between rounded-md border border-white/10 bg-slate-950/70 px-4 py-3 text-left text-sm text-white"
						onClick={() => onChange(fieldKey, !Boolean(value))}
					>
						<span>{Boolean(value) ? "ON" : "OFF"}</span>
						<span
							className={`rounded-full px-3 py-1 text-xs ${Boolean(value) ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-300"}`}
						>
							{Boolean(value) ? "有効" : "無効"}
						</span>
					</button>
				)
			) : field.type === "select" ? (
				<select
					className={baseClass}
					value={String(value ?? "")}
					onChange={(event) => onChange(fieldKey, event.target.value)}
					disabled={readOnly}
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
					type={
						field.type === "number"
							? "number"
							: field.type === "date"
								? "date"
								: "text"
					}
					inputMode={field.type === "number" ? "decimal" : undefined}
					placeholder={field.placeholder}
					value={String(value ?? "")}
					onChange={(event) =>
						onChange(
							fieldKey,
							field.type === "number"
								? event.target.value
								: event.target.value,
						)
					}
					disabled={readOnly}
					readOnly={readOnly}
				/>
			)}
			{field.helpText ? (
				<p className="mt-2 text-xs leading-5 text-slate-400">
					{field.helpText}
				</p>
			) : null}
		</label>
  );
}
