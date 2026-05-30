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

export interface ComposableArrayItem {
  id: string;
  fields: ComposableFieldRow[];
}

export interface ComposableFieldGroup {
  id: string;
  prefix: string;
  /** 非繰り返し時の行、または繰り返し時のテンプレート定義。 */
  fields: ComposableFieldRow[];
  /** 繰り返しフィールド（JSON 配列）のとき true。 */
  repeatable?: boolean;
  /** 繰り返し時の配列要素。空配列も可（FIELD.md プラン2）。 */
  items?: ComposableArrayItem[];
}

const ARRAY_INDEX_SEGMENT_RE = /^\d+$/;
const WILDCARD_FORMAT_PATH_RE = /^(.+)\.\*\.(.+)$/;

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

/** フィールド複製用: 末尾 01〜99 の2桁連番（FIELD.md プラン1） */
const AUTO_SERIAL_SUFFIX_RE = /(0[1-9]|[1-9][0-9])$/;

export function splitAutoSerial(name: string): { base: string; serial: number | null } {
  const match = name.match(new RegExp(`^(.+)${AUTO_SERIAL_SUFFIX_RE.source}$`));
  if (!match) {
    return { base: name, serial: null };
  }
  return { base: match[1]!, serial: Number.parseInt(match[2]!, 10) };
}

/**
 * 複製先フィールドネームを決める（ベース名抽出 + 空き最小2桁番号）。
 * existingPrefixes には複製元を含む画面上の全ネームを渡す。
 */
export function nextDuplicatePrefix(sourcePrefix: string, existingPrefixes: string[]): string {
  const { base } = splitAutoSerial(sourcePrefix);
  let maxSerial = 0;

  for (const prefix of existingPrefixes) {
    const split = splitAutoSerial(prefix);
    if (split.base !== base) {
      continue;
    }
    if (split.serial === null) {
      maxSerial = Math.max(maxSerial, 0);
    } else {
      maxSerial = Math.max(maxSerial, split.serial);
    }
  }

  const next = maxSerial + 1;
  const suffix = next <= 99 ? String(next).padStart(2, '0') : String(next);
  return `${base}${suffix}`;
}

/** フィールドグループを複製し、行の jsonPath / value / format を newPrefix へ写像する。id は呼び出し側で差し替える。 */
export function duplicateFieldGroup(
  group: ComposableFieldGroup,
  newPrefix: string,
): ComposableFieldGroup {
  const fields = migratePathsOnPrefixChange(
    group.prefix,
    newPrefix,
    group.fields.map((field) => ({ ...field })),
    {},
  );

  if (group.repeatable && group.items) {
    const items = group.items.map((item, index) => ({
      ...item,
      fields: migratePathsOnPrefixChange(
        group.prefix,
        newPrefix,
        item.fields.map((field) => ({
          ...field,
          jsonPath: buildArrayElementJsonPath(newPrefix, index, field.suffix),
        })),
        {},
      ),
    }));

    return {
      ...group,
      prefix: newPrefix,
      fields,
      items,
    };
  }

  return {
    ...group,
    prefix: newPrefix,
    fields,
  };
}

export function normalizePrefix(prefix: string): string {
  return prefix.trim();
}

export function isArrayIndexSegment(segment: string): boolean {
  return ARRAY_INDEX_SEGMENT_RE.test(segment);
}

export function buildJsonPath(prefix: string, suffix: string): string {
  const normalizedPrefix = normalizePrefix(prefix);
  if (!normalizedPrefix) {
    return suffix;
  }
  return `${normalizedPrefix}.${suffix}`;
}

/** 配列要素の jsonPath（例: cards + 0 + title → cards.0.title） */
export function buildArrayElementJsonPath(
  fieldPrefix: string,
  index: number,
  suffix: string,
): string {
  const normalizedPrefix = normalizePrefix(fieldPrefix);
  if (!normalizedPrefix) {
    return `${index}.${suffix}`;
  }
  return `${normalizedPrefix}.${index}.${suffix}`;
}

/** composableFieldFormats 用テンプレートキー（例: cards.*.title） */
export function buildWildcardFormatPath(fieldPrefix: string, suffix: string): string {
  const normalizedPrefix = normalizePrefix(fieldPrefix);
  if (!normalizedPrefix) {
    return `*.${suffix}`;
  }
  return `${normalizedPrefix}.*.${suffix}`;
}

export function parseWildcardFormatPath(
  path: string,
): { fieldPrefix: string; suffix: string } | null {
  const match = path.match(WILDCARD_FORMAT_PATH_RE);
  if (!match) {
    return null;
  }
  return { fieldPrefix: match[1]!, suffix: match[2]! };
}

export function resolveFormatFromMap(
  formats: Record<string, ComposableFieldFormat>,
  jsonPath: string,
): ComposableFieldFormat | undefined {
  if (formats[jsonPath]) {
    return formats[jsonPath];
  }

  const matched = matchKnownSuffix(jsonPath);
  if (!matched || matched.arrayIndex === undefined) {
    return undefined;
  }

  const wildcardKey = buildWildcardFormatPath(matched.prefix, matched.suffix);
  return formats[wildcardKey];
}

/** Field name（prefix）のドット区切りセグメント: 英数字・_・- のみ。数字始まり可。 */
const PREFIX_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

export const PREFIX_VALIDATION_MESSAGE =
  'Field name can only use letters, numbers, underscores, and hyphens. Separate nested keys with dots.';

export function validatePrefix(prefix: string): { valid: boolean; message?: string } {
  const normalized = normalizePrefix(prefix);
  if (!normalized) {
    return { valid: true };
  }

  const segments = normalized.split('.');
  for (const segment of segments) {
    if (!segment || !PREFIX_SEGMENT_RE.test(segment)) {
      return {
        valid: false,
        message: PREFIX_VALIDATION_MESSAGE,
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
    if (group.repeatable) {
      for (const field of group.fields) {
        if (supportsFormat(field.type)) {
          formats[buildWildcardFormatPath(group.prefix, field.suffix)] = field.format ?? 'plain';
        }
      }
      continue;
    }

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

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          paths.push(...collectLeafPaths(item as Record<string, unknown>, `${path}.${index}`));
        }
      });
      continue;
    }

    if (value !== null && typeof value === 'object') {
      paths.push(...collectLeafPaths(value as Record<string, unknown>, path));
      continue;
    }

    paths.push(path);
  }

  return paths;
}

function splitPrefixWithOptionalIndex(prefixPart: string): {
  prefix: string;
  arrayIndex?: number;
} {
  const match = prefixPart.match(/^(.+)\.(\d+)$/);
  if (!match) {
    return { prefix: prefixPart };
  }

  return { prefix: match[1]!, arrayIndex: Number.parseInt(match[2]!, 10) };
}

export function matchKnownSuffix(path: string): {
  prefix: string;
  suffix: string;
  type: ComposableFieldType;
  arrayIndex?: number;
} | null {
  for (const { suffix, type } of KNOWN_FIELD_SUFFIXES) {
    if (path === suffix) {
      return { prefix: '', suffix, type };
    }

    const dottedSuffix = `.${suffix}`;
    if (!path.endsWith(dottedSuffix)) {
      continue;
    }

    const prefixPart = path.slice(0, -dottedSuffix.length);
    const { prefix, arrayIndex } = splitPrefixWithOptionalIndex(prefixPart);
    return { prefix, suffix, type, arrayIndex };
  }

  return null;
}

function createArrayItemFields(
  fieldPrefix: string,
  index: number,
  templateFields: ComposableFieldRow[],
  element: Record<string, unknown>,
  formats: Record<string, ComposableFieldFormat>,
): ComposableFieldRow[] {
  return templateFields.map((template) => {
    const jsonPath = buildArrayElementJsonPath(fieldPrefix, index, template.suffix);
    return {
      ...template,
      jsonPath,
      value: readDraftFromData(element, '', template.suffix),
      format:
        template.format ??
        resolveFormatFromMap(formats, jsonPath) ??
        formats[buildWildcardFormatPath(fieldPrefix, template.suffix)] ??
        'plain',
    };
  });
}

export function createArrayItemFromTemplate(
  fieldPrefix: string,
  index: number,
  templateFields: ComposableFieldRow[],
  sourceElement: Record<string, unknown> = {},
  formats: Record<string, ComposableFieldFormat> = {},
  createItemId: () => string = () => `item-${Date.now()}`,
): ComposableArrayItem {
  return {
    id: createItemId(),
    fields: createArrayItemFields(fieldPrefix, index, templateFields, sourceElement, formats),
  };
}

function buildTemplateFieldsFromSuffixes(
  fieldPrefix: string,
  suffixes: Set<string>,
  formats: Record<string, ComposableFieldFormat>,
): ComposableFieldRow[] {
  const fields: ComposableFieldRow[] = [];

  if (suffixes.has(TITLE_SUFFIX)) {
    const suffix = TITLE_SUFFIX;
    const wildcard = buildWildcardFormatPath(fieldPrefix, suffix);
    fields.push({
      type: 'title',
      suffix,
      jsonPath: buildJsonPath(fieldPrefix, suffix),
      value: '',
      format: formats[wildcard] ?? formats[buildJsonPath(fieldPrefix, suffix)] ?? 'plain',
    });
  }

  if (suffixes.has(TEXT_SUFFIX)) {
    const suffix = TEXT_SUFFIX;
    const wildcard = buildWildcardFormatPath(fieldPrefix, suffix);
    fields.push({
      type: 'text',
      suffix,
      jsonPath: buildJsonPath(fieldPrefix, suffix),
      value: '',
      format: formats[wildcard] ?? formats[buildJsonPath(fieldPrefix, suffix)] ?? 'plain',
    });
  }

  const hasImageBundle = IMAGE_BUNDLE_SUFFIX_LIST.some((suffix) => suffixes.has(suffix));
  if (hasImageBundle) {
    for (const row of expandImageBundle(fieldPrefix)) {
      fields.push({ ...row, value: '' });
    }
  }

  return fields;
}

function elementObjectToFields(
  fieldPrefix: string,
  index: number,
  element: Record<string, unknown>,
  templateFields: ComposableFieldRow[],
  formats: Record<string, ComposableFieldFormat>,
): ComposableFieldRow[] {
  return createArrayItemFields(fieldPrefix, index, templateFields, element, formats);
}

function fieldsToElementObject(fields: ComposableFieldRow[]): Record<string, unknown> {
  const element: Record<string, unknown> = {};
  for (const field of fields) {
    writeFieldValueInObject(element, field.suffix, field.value);
  }
  return element;
}

/** 配列要素オブジェクトへ suffix ベースで値を書き込む（admin-api と同等のネスト生成）。 */
function writeFieldValueInObject(
  data: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const parts = key.split('.');
  if (parts.length === 1) {
    data[key] = value;
    return;
  }

  let current = data;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!;
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1] ?? ''] = value;
}

export function buildRepeatableArrayValue(items: ComposableArrayItem[]): unknown[] {
  return items.map((item) => fieldsToElementObject(item.fields));
}

export function restoreGroupsFromData(
  data: Record<string, unknown>,
  createId: () => string = () => `group-${Date.now()}`,
  formats: Record<string, ComposableFieldFormat> = {},
): ComposableFieldGroup[] {
  const groups: ComposableFieldGroup[] = [];
  const arrayPrefixes = new Set<string>();
  const objectPrefixSuffixes = new Map<string, Set<string>>();
  let itemIdCounter = 0;
  const createItemId = () => `item-${++itemIdCounter}`;

  const registerObjectSuffix = (prefix: string, suffix: string) => {
    const suffixSet = objectPrefixSuffixes.get(prefix) ?? new Set<string>();
    suffixSet.add(suffix);
    objectPrefixSuffixes.set(prefix, suffixSet);
  };

  for (const [key, value] of Object.entries(data)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const fieldPrefix = key;
    const suffixes = new Set<string>();

    for (const path of collectLeafPaths(data)) {
      const matched = matchKnownSuffix(path);
      if (!matched || matched.prefix !== fieldPrefix || matched.arrayIndex === undefined) {
        continue;
      }
      suffixes.add(matched.suffix);
    }

    for (const formatPath of Object.keys(formats)) {
      const wildcard = parseWildcardFormatPath(formatPath);
      if (wildcard?.fieldPrefix === fieldPrefix) {
        suffixes.add(wildcard.suffix);
      }
    }

    const templateFields = buildTemplateFieldsFromSuffixes(fieldPrefix, suffixes, formats);
    if (templateFields.length === 0) {
      continue;
    }

    const items = value
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item))
      .map((element, index) => ({
        id: createItemId(),
        fields: elementObjectToFields(fieldPrefix, index, element, templateFields, formats),
      }));

    groups.push({
      id: createId(),
      prefix: fieldPrefix,
      fields: templateFields,
      repeatable: true,
      items,
    });
    arrayPrefixes.add(fieldPrefix);
  }

  for (const path of collectLeafPaths(data)) {
    const matched = matchKnownSuffix(path);
    if (!matched || matched.arrayIndex !== undefined) {
      continue;
    }
    if (arrayPrefixes.has(matched.prefix)) {
      continue;
    }
    registerObjectSuffix(matched.prefix, matched.suffix);
  }

  for (const path of Object.keys(formats)) {
    const wildcard = parseWildcardFormatPath(path);
    if (wildcard) {
      if (!arrayPrefixes.has(wildcard.fieldPrefix)) {
        const existing = objectPrefixSuffixes.get(wildcard.fieldPrefix) ?? new Set<string>();
        existing.add(wildcard.suffix);
        objectPrefixSuffixes.set(wildcard.fieldPrefix, existing);
      }
      continue;
    }

    const matched = matchKnownSuffix(path);
    if (!matched || matched.arrayIndex !== undefined || arrayPrefixes.has(matched.prefix)) {
      continue;
    }
    registerObjectSuffix(matched.prefix, matched.suffix);
  }

  for (const [prefix, suffixes] of objectPrefixSuffixes) {
    const fields: ComposableFieldRow[] = [];

    if (suffixes.has(TITLE_SUFFIX)) {
      const jsonPath = buildJsonPath(prefix, TITLE_SUFFIX);
      fields.push({
        type: 'title',
        suffix: TITLE_SUFFIX,
        jsonPath,
        value: readDraftFromData(data, prefix, TITLE_SUFFIX),
        format: resolveFormatFromMap(formats, jsonPath) ?? 'plain',
      });
    }

    if (suffixes.has(TEXT_SUFFIX)) {
      const jsonPath = buildJsonPath(prefix, TEXT_SUFFIX);
      fields.push({
        type: 'text',
        suffix: TEXT_SUFFIX,
        jsonPath,
        value: readDraftFromData(data, prefix, TEXT_SUFFIX),
        format: resolveFormatFromMap(formats, jsonPath) ?? 'plain',
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

  for (const formatPath of Object.keys(formats)) {
    const wildcard = parseWildcardFormatPath(formatPath);
    if (!wildcard || arrayPrefixes.has(wildcard.fieldPrefix)) {
      continue;
    }

    const hasGroup = groups.some((group) => group.repeatable && group.prefix === wildcard.fieldPrefix);
    if (hasGroup) {
      continue;
    }

    const suffixes = new Set([wildcard.suffix]);
    const templateFields = buildTemplateFieldsFromSuffixes(wildcard.fieldPrefix, suffixes, formats);
    if (templateFields.length === 0) {
      continue;
    }

    groups.push({
      id: createId(),
      prefix: wildcard.fieldPrefix,
      fields: templateFields,
      repeatable: true,
      items: [],
    });
    arrayPrefixes.add(wildcard.fieldPrefix);
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
    if (current === null || current === undefined) {
      return '';
    }

    if (Array.isArray(current)) {
      const index = Number.parseInt(part, 10);
      if (!Number.isFinite(index) || index < 0 || index >= current.length) {
        return '';
      }
      current = current[index];
      continue;
    }

    if (typeof current !== 'object') {
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
