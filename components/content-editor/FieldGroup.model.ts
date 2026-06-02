import type { ImageFieldValue } from '@/components/admin-data/admin-api';
import type { ComposableArrayItem, ComposableFieldFormat, ComposableFieldRow } from '@/lib/admin/field-type-catalog';

export function updateFieldRow(
  fields: ComposableFieldRow[],
  jsonPath: string,
  value: string,
): ComposableFieldRow[] {
  return fields.map((field) => (field.jsonPath === jsonPath ? { ...field, value } : field));
}

export function updateFieldFormat(
  fields: ComposableFieldRow[],
  jsonPath: string,
  format: ComposableFieldFormat,
): ComposableFieldRow[] {
  return fields.map((field) => (field.jsonPath === jsonPath ? { ...field, format } : field));
}

export function applyImageFieldValue(
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

export function createArrayItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function reindexArrayItems(
  fieldPrefix: string,
  items: ComposableArrayItem[],
): ComposableArrayItem[] {
  return items.map((item, index) => ({
    ...item,
    fields: item.fields.map((field) => ({
      ...field,
      jsonPath: `${fieldPrefix}.${index}.${field.suffix}`,
    })),
  }));
}

export function isInteractiveSummaryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest('input, button, textarea, select, a, [contenteditable="true"]'),
  );
}
