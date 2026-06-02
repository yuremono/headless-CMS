'use client';

import { CardListItemsEditor, FaqItemsEditor, FeatureListItemsEditor } from './SectionArrayItemEditor';

interface SectionFieldFormProps {
  type: string;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}

function readString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

function readNestedString(data: Record<string, unknown>, parentKey: string, childKey: string): string {
  const parent = data[parentKey];
  if (!parent || typeof parent !== 'object') {
    return '';
  }

  const value = (parent as Record<string, unknown>)[childKey];
  return typeof value === 'string' ? value : '';
}

function writeNested(
  data: Record<string, unknown>,
  parentKey: string,
  childKey: string,
  value: string,
): Record<string, unknown> {
  const parent = data[parentKey];
  const nextParent =
    parent && typeof parent === 'object'
      ? { ...(parent as Record<string, unknown>), [childKey]: value }
      : { [childKey]: value };

  return { ...data, [parentKey]: nextParent };
}

function SectionInput({ label, value, onChange, multiline, placeholder, readOnly = false }: FieldProps) {
  const className =
		"mt-1 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20";

  return (
    <label className="SectionFieldFormField block">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {multiline ? (
        <textarea
          className={className}
          rows={4}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          disabled={readOnly}
          readOnly={readOnly}
        />
      ) : (
        <input
          className={className}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          disabled={readOnly}
          readOnly={readOnly}
        />
      )}
    </label>
  );
}

function ImageFields({
  data,
  onChange,
  readOnly = false,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="SectionFieldFormImage grid gap-3 sm:grid-cols-2">
      <SectionInput
        label="画像 URL"
        value={readNestedString(data, 'image', 'url')}
        placeholder="https://example.com/image.jpg"
        onChange={(value) => onChange(writeNested(data, 'image', 'url', value))}
        readOnly={readOnly}
      />
      <SectionInput
        label="代替テキスト"
        value={readNestedString(data, 'image', 'alt')}
        placeholder="画像の説明"
        onChange={(value) => onChange(writeNested(data, 'image', 'alt', value))}
        readOnly={readOnly}
      />
    </div>
  );
}

function ButtonFields({
  data,
  onChange,
  readOnly = false,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="SectionFieldFormButton grid gap-3 sm:grid-cols-2">
      <SectionInput
        label="ボタンラベル"
        value={readNestedString(data, 'button', 'label')}
        onChange={(value) => onChange(writeNested(data, 'button', 'label', value))}
        readOnly={readOnly}
      />
      <SectionInput
        label="リンク先"
        value={readNestedString(data, 'button', 'href')}
        placeholder="/contact"
        onChange={(value) => onChange(writeNested(data, 'button', 'href', value))}
        readOnly={readOnly}
      />
    </div>
  );
}

function GenericFields({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  return (
    <>
      <SectionInput
        label="タイトル"
        value={readString(data, 'title')}
        onChange={(value) => onChange({ ...data, title: value })}
      />
      <SectionInput
        label="本文"
        value={readString(data, 'body')}
        multiline
        onChange={(value) => onChange({ ...data, body: value })}
      />
    </>
  );
}

export function SectionFieldForm({ type, data, onChange, readOnly = false }: SectionFieldFormProps) {
  if (type === 'hero') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <SectionInput
          label="タイトル"
          value={readString(data, 'title')}
          onChange={(value) => onChange({ ...data, title: value })}
        />
        <SectionInput
          label="リード"
          value={readString(data, 'lead')}
          multiline
          onChange={(value) => onChange({ ...data, lead: value })}
        />
        <ImageFields data={data} onChange={onChange} readOnly={readOnly} />
        <ButtonFields data={data} onChange={onChange} readOnly={readOnly} />
      </div>
    );
  }

  if (type === 'titleGroup') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <SectionInput
          label="タイトル"
          value={readString(data, 'title')}
          onChange={(value) => onChange({ ...data, title: value })}
        />
        <SectionInput
          label="リード"
          value={readString(data, 'lead')}
          multiline
          onChange={(value) => onChange({ ...data, lead: value })}
        />
      </div>
    );
  }

  if (type === 'textBlock') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <SectionInput
          label="タイトル"
          value={readString(data, 'title')}
          onChange={(value) => onChange({ ...data, title: value })}
        />
        <SectionInput
          label="本文"
          value={readString(data, 'body')}
          multiline
          placeholder="HTML 可"
          onChange={(value) => onChange({ ...data, body: value })}
        />
      </div>
    );
  }

  if (type === 'imageText') {
    return (
		<div className="SectionFieldForm grid gap-3">
			<SectionInput
				label="タイトル"
				value={readString(data, "title")}
				onChange={(value) => onChange({ ...data, title: value })}
			/>
			<SectionInput
				label="本文"
				value={readString(data, "body")}
				multiline
				onChange={(value) => onChange({ ...data, body: value })}
			/>
			<label className="SectionFieldFormField block">
				<span className="text-xs font-medium text-slate-300">
					画像位置
				</span>
				<select
					className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
					value={readString(data, "imagePosition") || "right"}
					onChange={(event) =>
						onChange({ ...data, imagePosition: event.target.value })
					}
					disabled={readOnly}
				>
					<option value="left">左</option>
					<option value="right">右</option>
				</select>
			</label>
			<ImageFields data={data} onChange={onChange} />
		</div>
	);
  }

  if (type === 'cardList') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <SectionInput
          label="セクションタイトル"
          value={readString(data, 'title')}
          onChange={(value) => onChange({ ...data, title: value })}
        />
        <SectionInput
          label="カード概要"
          value={readString(data, 'summary')}
          multiline
          placeholder="カード一覧の説明文"
          onChange={(value) => onChange({ ...data, summary: value })}
        />
        <CardListItemsEditor data={data} onChange={onChange} />
      </div>
    );
  }

  if (type === 'featureList') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <SectionInput
          label="セクションタイトル"
          value={readString(data, 'title')}
          onChange={(value) => onChange({ ...data, title: value })}
        />
        <FeatureListItemsEditor data={data} onChange={onChange} />
      </div>
    );
  }

  if (type === 'faq') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <SectionInput
          label="セクションタイトル"
          value={readString(data, 'title')}
          onChange={(value) => onChange({ ...data, title: value })}
        />
        <FaqItemsEditor data={data} onChange={onChange} />
      </div>
    );
  }

  if (type === 'cta') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <SectionInput
          label="タイトル"
          value={readString(data, 'title')}
          onChange={(value) => onChange({ ...data, title: value })}
        />
        <SectionInput
          label="本文"
          value={readString(data, 'body')}
          multiline
          onChange={(value) => onChange({ ...data, body: value })}
        />
        <ButtonFields data={data} onChange={onChange} />
      </div>
    );
  }

  if (type === 'newsList' || type === 'gallery') {
    return (
      <div className="SectionFieldForm grid gap-3">
        <GenericFields data={data} onChange={onChange} />
        <SectionInput
          label="補足"
          value={readString(data, 'note')}
          multiline
          placeholder="一覧データは Phase 2 後半で拡張予定"
          onChange={(value) => onChange({ ...data, note: value })}
        />
      </div>
    );
  }

  return (
    <div className="SectionFieldForm grid gap-3">
      <GenericFields data={data} onChange={onChange} />
    </div>
  );
}
