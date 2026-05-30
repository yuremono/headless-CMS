/**
 * CMS エージェント向け composable フィールド操作ユーティリティ。
 * 純粋関数（HTTP なし）。引数の data / fieldFormats を変更せず新しいオブジェクトを返す。
 */

import {
  duplicateFieldGroup,
  nextDuplicatePrefix,
  restoreGroupsFromData,
  buildJsonPath,
  buildWildcardFormatPath,
  type ComposableFieldFormat,
  type ComposableFieldGroup,
} from '../admin/field-type-catalog';

// ---------------------------------------------------------------------------
// 公開型
// ---------------------------------------------------------------------------

/** フィールドグループ追加時の中身指定 */
export interface FieldPathSpec {
  /** フィールドサフィックス（例: 'title', 'text', 'image.url'） */
  suffix: string;
  /** title / text のみ有効。未指定時は 'plain' */
  format?: ComposableFieldFormat;
}

/** 多くの操作の戻り値 */
export interface FieldOpsResult {
  data: Record<string, unknown>;
  fieldFormats: Record<string, ComposableFieldFormat>;
}

/** duplicateFieldInData の戻り値 */
export interface DuplicateFieldResult extends FieldOpsResult {
  newPrefix: string;
}

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

/** JSON ラウンドトリップによる深コピー（JSON-safe なデータ前提） */
function cloneData(data: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

function cloneFormats(
  formats: Record<string, ComposableFieldFormat>,
): Record<string, ComposableFieldFormat> {
  return { ...formats };
}

/**
 * data から指定パスの値を読み取る。
 * 数値インデックスセグメントは配列アクセスとして解釈する。
 */
function readValueAtPath(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number.parseInt(part, 10);
      current = Number.isFinite(index) ? current[index] : undefined;
      continue;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * data の指定パスに値を書き込む（破壊的変更）。
 * admin-api.ts の writeFieldValue と同等ロジック。
 */
function writeFieldValueMutating(
  data: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  const parts = key.split('.');

  if (parts.length === 1) {
    data[key] = value;
    return;
  }

  let current: Record<string, unknown> | unknown[] = data;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]!;
    const nextPart = parts[index + 1];
    const nextIsIndex = nextPart !== undefined && /^\d+$/.test(nextPart);

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(part, 10);
      if (!Number.isFinite(arrayIndex)) {
        return;
      }
      const existing = current[arrayIndex];
      if (
        nextIsIndex
          ? !Array.isArray(existing)
          : !existing || typeof existing !== 'object' || Array.isArray(existing)
      ) {
        current[arrayIndex] = nextIsIndex ? [] : {};
      }
      current = current[arrayIndex] as Record<string, unknown> | unknown[];
      continue;
    }

    const record = current as Record<string, unknown>;
    const next = record[part];

    if (nextIsIndex) {
      if (!Array.isArray(next)) {
        record[part] = [];
      }
      current = record[part] as unknown[];
      continue;
    }

    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      record[part] = {};
    }

    current = record[part] as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1] ?? '';
  if (Array.isArray(current)) {
    const arrayIndex = Number.parseInt(leaf, 10);
    if (Number.isFinite(arrayIndex)) {
      current[arrayIndex] = value;
    }
    return;
  }

  (current as Record<string, unknown>)[leaf] = value;
}

// ---------------------------------------------------------------------------
// 公開関数
// ---------------------------------------------------------------------------

/**
 * data の jsonPath に value をセットした新しい data を返す（immutable）。
 */
export function setFieldValue(
  data: Record<string, unknown>,
  jsonPath: string,
  value: unknown,
): Record<string, unknown> {
  const result = cloneData(data);
  writeFieldValueMutating(result, jsonPath, value);
  return result;
}

/**
 * 新しいフィールドグループを data と fieldFormats に追加する。
 *
 * - repeatable=true: data[prefix] を空配列で初期化し、フォーマットはワイルドカードキーで登録
 * - repeatable=false（既定）: フォーマットのみ登録（data への書き込みはしない）
 * - image 系サフィックス（image.url / image.alt / href）はフォーマット登録対象外
 */
export function addFieldGroup(
  data: Record<string, unknown>,
  fieldFormats: Record<string, ComposableFieldFormat>,
  options: {
    prefix: string;
    fieldPaths: FieldPathSpec[];
    repeatable?: boolean;
  },
): FieldOpsResult {
  const { prefix, fieldPaths, repeatable = false } = options;
  const newData = cloneData(data);
  const newFormats = cloneFormats(fieldFormats);

  if (repeatable && !Array.isArray(newData[prefix])) {
    newData[prefix] = [];
  }

  for (const { suffix, format } of fieldPaths) {
    if (suffix !== 'title' && suffix !== 'text') {
      continue;
    }
    const resolvedFormat: ComposableFieldFormat = format ?? 'plain';
    const formatKey = repeatable
      ? buildWildcardFormatPath(prefix, suffix)
      : buildJsonPath(prefix, suffix);
    newFormats[formatKey] = resolvedFormat;
  }

  return { data: newData, fieldFormats: newFormats };
}

/**
 * 指定 prefix のフィールドグループを data と fieldFormats から削除する。
 */
export function removeFieldGroup(
  data: Record<string, unknown>,
  fieldFormats: Record<string, ComposableFieldFormat>,
  prefix: string,
): FieldOpsResult {
  const newData = cloneData(data);
  const newFormats = cloneFormats(fieldFormats);

  // data から prefix を削除
  const parts = prefix.split('.');
  let container: Record<string, unknown> = newData;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = container[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      return { data: newData, fieldFormats: newFormats };
    }
    container = next as Record<string, unknown>;
  }
  delete container[parts[parts.length - 1]!];

  // fieldFormats から prefix 配下のキーを削除
  const prefixDot = `${prefix}.`;
  for (const key of Object.keys(newFormats)) {
    if (key === prefix || key.startsWith(prefixDot)) {
      delete newFormats[key];
    }
  }

  return { data: newData, fieldFormats: newFormats };
}

/**
 * sourcePrefix のフィールドを複製する。
 * - 新 prefix は nextDuplicatePrefix で決定（例: hero → hero01）
 * - 構造は duplicateFieldGroup、値は sourcePrefix からコピー
 * - fieldFormats は sourcePrefix 配下を newPrefix 配下にコピー
 */
export function duplicateFieldInData(
  data: Record<string, unknown>,
  fieldFormats: Record<string, ComposableFieldFormat>,
  sourcePrefix: string,
  createId: () => string = () => `group-${Date.now()}`,
): DuplicateFieldResult {
  const groups = restoreGroupsFromData(data, createId, fieldFormats);
  const sourceGroup = groups.find((g) => g.prefix === sourcePrefix);

  if (!sourceGroup) {
    return { data, fieldFormats, newPrefix: sourcePrefix };
  }

  const existingPrefixes = groups.map((g) => g.prefix);
  const newPrefix = nextDuplicatePrefix(sourcePrefix, existingPrefixes);
  const newGroup = duplicateFieldGroup(sourceGroup, newPrefix);

  const newData = cloneData(data);
  const newFormats = cloneFormats(fieldFormats);

  copyGroupData(newData, data, sourceGroup, newGroup, sourcePrefix, newPrefix);
  copyFormatsByPrefix(newFormats, fieldFormats, sourcePrefix, newPrefix);

  return { data: newData, fieldFormats: newFormats, newPrefix };
}

function copyGroupData(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  sourceGroup: ComposableFieldGroup,
  newGroup: ComposableFieldGroup,
  sourcePrefix: string,
  newPrefix: string,
): void {
  if (sourceGroup.repeatable && Array.isArray(source[sourcePrefix])) {
    target[newPrefix] = JSON.parse(JSON.stringify(source[sourcePrefix]));
    return;
  }

  for (const field of newGroup.fields) {
    const srcPath = buildJsonPath(sourcePrefix, field.suffix);
    const dstPath = buildJsonPath(newPrefix, field.suffix);
    const value = readValueAtPath(source, srcPath);
    if (value !== undefined) {
      writeFieldValueMutating(target, dstPath, value);
    }
  }
}

function copyFormatsByPrefix(
  target: Record<string, ComposableFieldFormat>,
  source: Record<string, ComposableFieldFormat>,
  sourcePrefix: string,
  newPrefix: string,
): void {
  const prefixDot = `${sourcePrefix}.`;
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith(prefixDot)) {
      target[`${newPrefix}.${key.slice(prefixDot.length)}`] = value;
    }
  }
}

/**
 * フィールドのプレフィックスを変更する（リネーム）。
 * data の値を oldPrefix から newPrefix に移動し、fieldFormats のキーも更新する。
 */
export function renameFieldPrefix(
  data: Record<string, unknown>,
  fieldFormats: Record<string, ComposableFieldFormat>,
  oldPrefix: string,
  newPrefix: string,
): FieldOpsResult {
  if (oldPrefix === newPrefix) {
    return { data, fieldFormats };
  }

  const newData = cloneData(data);

  // oldPrefix の親コンテナを辿り、値を取り出して newPrefix に書き込む
  const parts = oldPrefix.split('.');
  let container: Record<string, unknown> = newData;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = container[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      return { data: newData, fieldFormats: cloneFormats(fieldFormats) };
    }
    container = next as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1]!;
  if (lastPart in container) {
    const srcValue = container[lastPart];
    delete container[lastPart];
    writeFieldValueMutating(newData, newPrefix, srcValue);
  }

  // fieldFormats のキーを移行
  const newFormats: Record<string, ComposableFieldFormat> = {};
  const prefixDot = `${oldPrefix}.`;
  for (const [key, value] of Object.entries(fieldFormats)) {
    if (key.startsWith(prefixDot)) {
      newFormats[`${newPrefix}.${key.slice(prefixDot.length)}`] = value;
    } else {
      newFormats[key] = value;
    }
  }

  return { data: newData, fieldFormats: newFormats };
}
