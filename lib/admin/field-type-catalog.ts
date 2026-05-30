export type ComposableFieldType = 'title' | 'text' | 'imageUrl' | 'imageAlt' | 'href';

export type ComposableFieldValue = string;

/**
 * title / text フィールドの保存形式。
 * - plain: 文字列をそのまま保存。フロントは data-cms（textContent）で安全に表示。
 * - richText: サニタイズ済み HTML を保存。フロントは data-cms-html で表示し、span 等のインライン装飾を許可。
 */
export type ComposableFieldFormat = 'plain' | 'richText';

export const composableFieldFormats: readonly ComposableFieldFormat[] = ['plain', 'richText'];

/** format を持てるのは title / text のみ（画像系は対象外）。 */
export function supportsFormat(type: ComposableFieldType): boolean {
  return type === 'title' || type === 'text';
}

export function isComposableFieldFormat(value: unknown): value is ComposableFieldFormat {
  return value === 'plain' || value === 'richText';
}

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
  /** title / text のみ。未指定は 'plain' 扱い。 */
  format?: ComposableFieldFormat;
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

const IMAGE_BUNDLE_SUFFIX_LIST = ['image.url', 'image.alt', 'href'] as const;

const KNOWN_FIELD_SUFFIXES: Array<{
  suffix: string;
  type: ComposableFieldType;
  bundle?: 'image';
}> = [
  { suffix: 'image.url', type: 'imageUrl', bundle: 'image' },
  { suffix: 'image.alt', type: 'imageAlt', bundle: 'image' },
  { suffix: 'href', type: 'href', bundle: 'image' },
  { suffix: TITLE_SUFFIX, type: 'title' },
  { suffix: TEXT_SUFFIX, type: 'text' },
];

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
  format: ComposableFieldFormat = 'plain',
): ComposableFieldRow[] {
  const rows: ComposableFieldRow[] = [];

  if (selection.title) {
    const suffix = TITLE_SUFFIX;
    rows.push({
      type: 'title',
      suffix,
      jsonPath: buildJsonPath(prefix, suffix),
      value: readDraftFromData(sourceData, prefix, suffix),
      format,
    });
  }

  if (selection.text) {
    const suffix = TEXT_SUFFIX;
    rows.push({
      type: 'text',
      suffix,
      jsonPath: buildJsonPath(prefix, suffix),
      value: readDraftFromData(sourceData, prefix, suffix),
      format,
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

/** グループ群から title / text の format マップ（jsonPath -> format）を収集する。 */
export function collectComposableFieldFormats(
  groups: ComposableFieldGroup[],
): Record<string, ComposableFieldFormat> {
  const formats: Record<string, ComposableFieldFormat> = {};

  for (const group of groups) {
    for (const field of group.fields) {
      if (supportsFormat(field.type)) {
        formats[field.jsonPath] = field.format ?? 'plain';
      }
    }
  }

  return formats;
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

export function collectLeafPaths(data: Record<string, unknown>, pathPrefix = ''): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...collectLeafPaths(value as Record<string, unknown>, path));
      continue;
    }

    paths.push(path);
  }

  return paths;
}

export function matchKnownSuffix(
  path: string,
): { prefix: string; suffix: string; type: ComposableFieldType } | null {
  for (const { suffix, type } of KNOWN_FIELD_SUFFIXES) {
    if (path === suffix) {
      return { prefix: '', suffix, type };
    }

    const dottedSuffix = `.${suffix}`;
    if (path.endsWith(dottedSuffix)) {
      return {
        prefix: path.slice(0, -dottedSuffix.length),
        suffix,
        type,
      };
    }
  }

  return null;
}

export function restoreGroupsFromData(
  data: Record<string, unknown>,
  createId: () => string = () => `group-${Date.now()}`,
  formats: Record<string, ComposableFieldFormat> = {},
): ComposableFieldGroup[] {
  const prefixSuffixes = new Map<string, Set<string>>();

  for (const path of collectLeafPaths(data)) {
    const matched = matchKnownSuffix(path);
    if (!matched) {
      continue;
    }

    const suffixSet = prefixSuffixes.get(matched.prefix) ?? new Set<string>();
    suffixSet.add(matched.suffix);
    prefixSuffixes.set(matched.prefix, suffixSet);
  }

  // data に値が無くても format だけ定義済みのパスを拾う（リッチ指定が空保存後も保持される）。
  for (const path of Object.keys(formats)) {
    const matched = matchKnownSuffix(path);
    if (!matched) {
      continue;
    }
    const suffixSet = prefixSuffixes.get(matched.prefix) ?? new Set<string>();
    suffixSet.add(matched.suffix);
    prefixSuffixes.set(matched.prefix, suffixSet);
  }

  const groups: ComposableFieldGroup[] = [];

  for (const [prefix, suffixes] of prefixSuffixes) {
    const fields: ComposableFieldRow[] = [];

    if (suffixes.has(TITLE_SUFFIX)) {
      const jsonPath = buildJsonPath(prefix, TITLE_SUFFIX);
      fields.push({
        type: 'title',
        suffix: TITLE_SUFFIX,
        jsonPath,
        value: readDraftFromData(data, prefix, TITLE_SUFFIX),
        format: formats[jsonPath] ?? 'plain',
      });
    }

    if (suffixes.has(TEXT_SUFFIX)) {
      const jsonPath = buildJsonPath(prefix, TEXT_SUFFIX);
      fields.push({
        type: 'text',
        suffix: TEXT_SUFFIX,
        jsonPath,
        value: readDraftFromData(data, prefix, TEXT_SUFFIX),
        format: formats[jsonPath] ?? 'plain',
      });
    }

    const hasImageBundle = IMAGE_BUNDLE_SUFFIX_LIST.some((suffix) => suffixes.has(suffix));
    if (hasImageBundle) {
      for (const row of expandImageBundle(prefix)) {
        fields.push({
          ...row,
          value: readDraftFromData(data, prefix, row.suffix),
        });
      }
    }

    if (fields.length > 0) {
      groups.push({
        id: createId(),
        prefix,
        fields,
      });
    }
  }

  return groups.sort((left, right) => left.prefix.localeCompare(right.prefix));
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
