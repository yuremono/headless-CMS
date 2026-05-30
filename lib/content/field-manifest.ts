import {
  collectLeafPaths,
  isComposableFieldFormat,
  matchKnownSuffix,
  parseWildcardFormatPath,
  resolveFormatFromMap,
  supportsFormat,
  type ComposableFieldFormat,
  type ComposableFieldType,
} from "@/lib/admin/field-type-catalog";
import { isPlainObject } from "@/lib/http";

/**
 * フロント検証ツール（data-cms 属性とパスの突き合わせ）向けのフィールドマニフェスト。
 * 配信 JSON の「契約」を機械可読にし、タイポ・改名の取りこぼしを検出できるようにする。
 */
export interface FieldManifestEntry {
  /** dataJson 上の完全パス（例 "hero.title"）。 */
  path: string;
  /** composable フィールド種別。 */
  type: ComposableFieldType;
  /** title / text のみ意味を持つ。それ以外は 'plain'。 */
  format: ComposableFieldFormat;
}

export interface FieldManifest {
  contentType: string;
  /** 既知 suffix（title/text/image.url/image.alt/href）に一致したパス一覧。 */
  paths: FieldManifestEntry[];
}

function readFormatMap(schemaJson: Record<string, unknown>): Record<string, ComposableFieldFormat> {
  const raw = schemaJson.composableFieldFormats;
  if (!isPlainObject(raw)) {
    return {};
  }

  const formats: Record<string, ComposableFieldFormat> = {};
  for (const [path, value] of Object.entries(raw)) {
    if (isComposableFieldFormat(value)) {
      formats[path] = value;
    }
  }
  return formats;
}

/**
 * schema_json.composableFieldFormats と実データの両方からパスを集約してマニフェストを作る。
 * data に値が無くても format 定義済みのパスは含める（リッチ指定の保持）。
 */
export function buildFieldManifest(
  contentType: string,
  schemaJson: Record<string, unknown>,
  dataJson: Record<string, unknown>,
): FieldManifest {
  const formats = readFormatMap(schemaJson);
  const byPath = new Map<string, FieldManifestEntry>();

  const register = (path: string, type: ComposableFieldType) => {
    if (byPath.has(path)) {
      return;
    }
    const format = supportsFormat(type)
      ? resolveFormatFromMap(formats, path) ?? "plain"
      : "plain";
    byPath.set(path, { path, type, format });
  };

  for (const path of collectLeafPaths(dataJson)) {
    const matched = matchKnownSuffix(path);
    if (matched) {
      register(path, matched.type);
    }
  }

  for (const path of Object.keys(formats)) {
    const wildcard = parseWildcardFormatPath(path);
    if (wildcard) {
      for (const leafPath of collectLeafPaths(dataJson)) {
        const matched = matchKnownSuffix(leafPath);
        if (
          matched &&
          matched.prefix === wildcard.fieldPrefix &&
          matched.arrayIndex !== undefined &&
          matched.suffix === wildcard.suffix
        ) {
          register(leafPath, matched.type);
        }
      }
      continue;
    }

    const matched = matchKnownSuffix(path);
    if (matched) {
      register(path, matched.type);
    }
  }

  const paths = [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
  return { contentType, paths };
}
