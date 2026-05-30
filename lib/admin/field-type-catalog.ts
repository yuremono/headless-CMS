export type ComposableFieldType = 'title' | 'text' | 'imageUrl' | 'imageAlt' | 'href';

export type ComposableFieldValue = string;

export interface ComposableFieldSelection {
  title: boolean;
  text: boolean;
  image: boolean;
}

export interface ComposableFieldRow {
  type: ComposableFieldType;
  suffix: string;
  jsonPath: string;
  value: ComposableFieldValue;
  bundle?: 'image';
}

export interface ComposableFieldGroup {
  id: string;
  prefix: string;
  fields: ComposableFieldRow[];
}

const IMAGE_BUNDLE_SUFFIXES: Array<{ type: ComposableFieldType; suffix: string; label: string }> = [
  { type: 'imageUrl', suffix: 'image.url', label: '画像URL' },
  { type: 'imageAlt', suffix: 'image.alt', label: '代替テキスト' },
  { type: 'href', suffix: 'href', label: 'リンク先' },
];

const TITLE_SUFFIX = 'title';
const TEXT_SUFFIX = 'text';

export function normalizePrefix(prefix: string): string {
  return prefix.trim();
}

export function buildJsonPath(prefix: string, suffix: string): string {
  const normalizedPrefix = normalizePrefix(prefix);
  if (!normalizedPrefix) {
    return suffix;
  }
  return `${normalizedPrefix}.${suffix}`;
}

export function validatePrefix(prefix: string): { valid: boolean; message?: string } {
  const normalized = normalizePrefix(prefix);
  if (!normalized) {
    return { valid: true };
  }

  const segments = normalized.split('.');
  for (const segment of segments) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(segment)) {
      return {
        valid: false,
        message: 'prefix は英字始まりの英数字（ドット区切り可）のみ使用できます。',
      };
    }
  }

  return { valid: true };
}

export function expandImageBundle(prefix: string): ComposableFieldRow[] {
  return IMAGE_BUNDLE_SUFFIXES.map((item) => ({
    type: item.type,
    suffix: item.suffix,
    jsonPath: buildJsonPath(prefix, item.suffix),
    value: '',
    bundle: 'image' as const,
  }));
}

export function createFieldsFromSelection(
  prefix: string,
  selection: ComposableFieldSelection,
  sourceData: Record<string, unknown>,
): ComposableFieldRow[] {
  const rows: ComposableFieldRow[] = [];

  if (selection.title) {
    const suffix = TITLE_SUFFIX;
    rows.push({
      type: 'title',
      suffix,
      jsonPath: buildJsonPath(prefix, suffix),
      value: readDraftFromData(sourceData, prefix, suffix),
    });
  }

  if (selection.text) {
    const suffix = TEXT_SUFFIX;
    rows.push({
      type: 'text',
      suffix,
      jsonPath: buildJsonPath(prefix, suffix),
      value: readDraftFromData(sourceData, prefix, suffix),
    });
  }

  if (selection.image) {
    for (const row of expandImageBundle(prefix)) {
      rows.push({
        ...row,
        value: readDraftFromData(sourceData, prefix, row.suffix),
      });
    }
  }

  return rows;
}

export function migratePathsOnPrefixChange(
  oldPrefix: string,
  newPrefix: string,
  fields: ComposableFieldRow[],
  sourceData: Record<string, unknown>,
): ComposableFieldRow[] {
  return fields.map((field) => {
    const oldPath = buildJsonPath(oldPrefix, field.suffix);
    const newPath = buildJsonPath(newPrefix, field.suffix);
    const existingValue = field.value;
    const hasValue =
      existingValue !== '' &&
      existingValue !== null &&
      existingValue !== undefined &&
      !(typeof existingValue === 'string' && existingValue.trim() === '');

    const value = hasValue
      ? existingValue
      : readDraftFromData(sourceData, oldPrefix, field.suffix, oldPath);

    return {
      ...field,
      jsonPath: newPath,
      value,
    };
  });
}

export function previewPathsForSelection(prefix: string, selection: ComposableFieldSelection): string[] {
  const paths: string[] = [];

  if (selection.title) {
    paths.push(buildJsonPath(prefix, TITLE_SUFFIX));
  }
  if (selection.text) {
    paths.push(buildJsonPath(prefix, TEXT_SUFFIX));
  }
  if (selection.image) {
    for (const row of expandImageBundle(prefix)) {
      paths.push(row.jsonPath);
    }
  }

  return paths;
}

export function getFieldTypeLabel(type: ComposableFieldType): string {
  switch (type) {
    case 'title':
      return 'タイトル';
    case 'text':
      return 'テキスト';
    case 'imageUrl':
      return '画像URL';
    case 'imageAlt':
      return '代替テキスト';
    case 'href':
      return 'リンク先';
    default:
      return type;
  }
}

function readDraftFromData(
  data: Record<string, unknown>,
  prefix: string,
  suffix: string,
  explicitPath?: string,
): ComposableFieldValue {
  const path = explicitPath ?? buildJsonPath(prefix, suffix);
  const parts = path.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current === null || current === undefined) {
    return '';
  }

  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? String(current)
    : '';
}
