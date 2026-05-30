import { describe, it, expect } from 'vitest';
import {
  setFieldValue,
  addFieldGroup,
  removeFieldGroup,
  duplicateFieldInData,
  renameFieldPrefix,
  type FieldPathSpec,
} from './field-ops';
import type { ComposableFieldFormat } from './field-catalog';

// ---------------------------------------------------------------------------
// setFieldValue
// ---------------------------------------------------------------------------

describe('setFieldValue', () => {
  it('hero.title を設定する', () => {
    const result = setFieldValue({}, 'hero.title', 'Hello');
    expect(result).toEqual({ hero: { title: 'Hello' } });
  });

  it('既存データを変更しない（immutable）', () => {
    const data: Record<string, unknown> = { hero: { title: 'Old' } };
    const result = setFieldValue(data, 'hero.title', 'New');
    expect(data).toEqual({ hero: { title: 'Old' } });
    expect(result).toEqual({ hero: { title: 'New' } });
  });

  it('配列インデックスパスに値を設定する', () => {
    const data = { cards: [{ title: 'A' }, { title: 'B' }] };
    const result = setFieldValue(data, 'cards.1.title', 'Updated');
    const cards = result.cards as Array<Record<string, unknown>>;
    expect(cards[0]?.title).toBe('A');
    expect(cards[1]?.title).toBe('Updated');
  });

  it('深いネストパスに値を設定する', () => {
    const result = setFieldValue({}, 'hero.image.url', '/img.jpg');
    expect(result).toEqual({ hero: { image: { url: '/img.jpg' } } });
  });
});

// ---------------------------------------------------------------------------
// addFieldGroup
// ---------------------------------------------------------------------------

describe('addFieldGroup', () => {
  it('plain フォーマットで非繰り返しフィールドグループを追加する', () => {
    const fieldPaths: FieldPathSpec[] = [
      { suffix: 'title', format: 'plain' },
      { suffix: 'text', format: 'plain' },
    ];
    const result = addFieldGroup({}, {}, { prefix: 'hero', fieldPaths });
    expect(result.fieldFormats['hero.title']).toBe('plain');
    expect(result.fieldFormats['hero.text']).toBe('plain');
  });

  it('richText フォーマットで title を追加する', () => {
    const fieldPaths: FieldPathSpec[] = [{ suffix: 'title', format: 'richText' }];
    const result = addFieldGroup({}, {}, { prefix: 'hero', fieldPaths });
    expect(result.fieldFormats['hero.title']).toBe('richText');
  });

  it('format 未指定時は plain がデフォルト', () => {
    const result = addFieldGroup({}, {}, { prefix: 'hero', fieldPaths: [{ suffix: 'title' }] });
    expect(result.fieldFormats['hero.title']).toBe('plain');
  });

  it('繰り返しフィールドグループ: 空配列とワイルドカードフォーマットを設定する', () => {
    const fieldPaths: FieldPathSpec[] = [{ suffix: 'title', format: 'richText' }];
    const result = addFieldGroup({}, {}, { prefix: 'cards', fieldPaths, repeatable: true });
    expect(result.data['cards']).toEqual([]);
    expect(result.fieldFormats['cards.*.title']).toBe('richText');
    expect(result.fieldFormats).not.toHaveProperty('cards.title');
  });

  it('image 系サフィックスはフォーマット登録対象外', () => {
    const fieldPaths: FieldPathSpec[] = [
      { suffix: 'image.url' },
      { suffix: 'image.alt' },
      { suffix: 'href' },
    ];
    const result = addFieldGroup({}, {}, { prefix: 'hero', fieldPaths });
    expect(Object.keys(result.fieldFormats)).toHaveLength(0);
  });

  it('既存 data / fieldFormats を変更しない（immutable）', () => {
    const data = { hero: { title: 'Existing' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'hero.title': 'plain' };
    addFieldGroup(data, fieldFormats, { prefix: 'new', fieldPaths: [{ suffix: 'title' }] });
    expect(fieldFormats).not.toHaveProperty('new.title');
    expect(data).not.toHaveProperty('new');
  });
});

// ---------------------------------------------------------------------------
// removeFieldGroup
// ---------------------------------------------------------------------------

describe('removeFieldGroup', () => {
  it('hero フィールドグループをデータから削除する', () => {
    const data = { hero: { title: 'Hello', text: 'World' }, other: 'keep' };
    const fieldFormats: Record<string, ComposableFieldFormat> = {
      'hero.title': 'plain',
      'hero.text': 'richText',
      'other.title': 'plain',
    };
    const result = removeFieldGroup(data, fieldFormats, 'hero');
    expect(result.data).not.toHaveProperty('hero');
    expect(result.data).toHaveProperty('other');
    expect(result.fieldFormats).not.toHaveProperty('hero.title');
    expect(result.fieldFormats).not.toHaveProperty('hero.text');
    expect(result.fieldFormats).toHaveProperty('other.title');
  });

  it('繰り返しフィールドグループを削除する', () => {
    const data = { cards: [{ title: 'A' }], hero: { title: 'Hero' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = {
      'cards.*.title': 'plain',
      'hero.title': 'plain',
    };
    const result = removeFieldGroup(data, fieldFormats, 'cards');
    expect(result.data).not.toHaveProperty('cards');
    expect(result.fieldFormats).not.toHaveProperty('cards.*.title');
    expect(result.fieldFormats).toHaveProperty('hero.title');
  });

  it('存在しないプレフィックスでもエラーにならない', () => {
    const data = { hero: { title: 'Hi' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'hero.title': 'plain' };
    const result = removeFieldGroup(data, fieldFormats, 'nonexistent');
    expect(result.data).toEqual(data);
    expect(result.fieldFormats).toEqual(fieldFormats);
  });

  it('元の data / fieldFormats を変更しない（immutable）', () => {
    const data = { hero: { title: 'X' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'hero.title': 'plain' };
    removeFieldGroup(data, fieldFormats, 'hero');
    expect(data).toHaveProperty('hero');
    expect(fieldFormats).toHaveProperty('hero.title');
  });
});

// ---------------------------------------------------------------------------
// duplicateFieldInData
// ---------------------------------------------------------------------------

describe('duplicateFieldInData', () => {
  it('hero を hero01 に複製する（値・フォーマット含む）', () => {
    const data = { hero: { title: 'Main', text: 'Body' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = {
      'hero.title': 'plain',
      'hero.text': 'richText',
    };
    const result = duplicateFieldInData(data, fieldFormats, 'hero');
    expect(result.newPrefix).toBe('hero01');
    expect(result.data['hero01']).toEqual({ title: 'Main', text: 'Body' });
    expect(result.fieldFormats['hero01.title']).toBe('plain');
    expect(result.fieldFormats['hero01.text']).toBe('richText');
    // オリジナルは変更なし
    expect(result.data['hero']).toEqual({ title: 'Main', text: 'Body' });
    expect(result.fieldFormats['hero.title']).toBe('plain');
  });

  it('繰り返し cards を cards01 に複製する', () => {
    const data = {
      cards: [
        { title: 'Card A', text: 'Text A' },
        { title: 'Card B', text: 'Text B' },
      ],
    };
    const fieldFormats: Record<string, ComposableFieldFormat> = {
      'cards.*.title': 'plain',
      'cards.*.text': 'richText',
    };
    const result = duplicateFieldInData(data, fieldFormats, 'cards');
    expect(result.newPrefix).toBe('cards01');
    const cards01 = result.data['cards01'] as Array<Record<string, unknown>>;
    expect(cards01).toHaveLength(2);
    expect(cards01[0]?.title).toBe('Card A');
    expect(cards01[1]?.title).toBe('Card B');
    expect(result.fieldFormats['cards01.*.title']).toBe('plain');
    expect(result.fieldFormats['cards01.*.text']).toBe('richText');
  });

  it('複製済み hero01 を複製すると hero02 になる', () => {
    const data = {
      hero: { title: 'Original' },
      hero01: { title: 'Copy 1' },
    };
    const fieldFormats: Record<string, ComposableFieldFormat> = {
      'hero.title': 'plain',
      'hero01.title': 'plain',
    };
    const result = duplicateFieldInData(data, fieldFormats, 'hero01');
    expect(result.newPrefix).toBe('hero02');
    expect(result.data['hero02']).toEqual({ title: 'Copy 1' });
  });

  it('hero, hero01, hero02 が存在する状態で hero を複製すると hero03 になる', () => {
    const data = {
      hero: { title: 'A' },
      hero01: { title: 'B' },
      hero02: { title: 'C' },
    };
    const fieldFormats: Record<string, ComposableFieldFormat> = {
      'hero.title': 'plain',
      'hero01.title': 'plain',
      'hero02.title': 'plain',
    };
    const result = duplicateFieldInData(data, fieldFormats, 'hero');
    expect(result.newPrefix).toBe('hero03');
  });

  it('存在しないプレフィックスはそのまま返す', () => {
    const result = duplicateFieldInData({}, {}, 'nonexistent');
    expect(result.newPrefix).toBe('nonexistent');
    expect(result.data).toEqual({});
    expect(result.fieldFormats).toEqual({});
  });

  it('元の data / fieldFormats を変更しない（immutable）', () => {
    const data = { hero: { title: 'X' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'hero.title': 'plain' };
    duplicateFieldInData(data, fieldFormats, 'hero');
    expect(data).not.toHaveProperty('hero01');
    expect(fieldFormats).not.toHaveProperty('hero01.title');
  });
});

// ---------------------------------------------------------------------------
// renameFieldPrefix
// ---------------------------------------------------------------------------

describe('renameFieldPrefix', () => {
  it('hero を hero01 にリネームする', () => {
    const data = { hero: { title: 'Hello', image: { url: '/a.jpg', alt: 'Alt' } } };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'hero.title': 'richText' };
    const result = renameFieldPrefix(data, fieldFormats, 'hero', 'hero01');
    expect(result.data).not.toHaveProperty('hero');
    expect(result.data['hero01']).toEqual({
      title: 'Hello',
      image: { url: '/a.jpg', alt: 'Alt' },
    });
    expect(result.fieldFormats['hero01.title']).toBe('richText');
    expect(result.fieldFormats).not.toHaveProperty('hero.title');
  });

  it('繰り返しフィールドのワイルドカードフォーマットキーをリネームする', () => {
    const data = { cards: [{ title: 'A' }] };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'cards.*.title': 'plain' };
    const result = renameFieldPrefix(data, fieldFormats, 'cards', 'cards01');
    expect(result.data).not.toHaveProperty('cards');
    expect(result.data['cards01']).toEqual([{ title: 'A' }]);
    expect(result.fieldFormats['cards01.*.title']).toBe('plain');
    expect(result.fieldFormats).not.toHaveProperty('cards.*.title');
  });

  it('同一プレフィックスへのリネームは元の参照をそのまま返す', () => {
    const data = { hero: { title: 'Hello' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'hero.title': 'plain' };
    const result = renameFieldPrefix(data, fieldFormats, 'hero', 'hero');
    expect(result.data).toBe(data);
    expect(result.fieldFormats).toBe(fieldFormats);
  });

  it('他のフィールドのフォーマットキーはそのまま保持する', () => {
    const data = { hero: { title: 'Hi' }, other: { title: 'Other' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = {
      'hero.title': 'richText',
      'other.title': 'plain',
    };
    const result = renameFieldPrefix(data, fieldFormats, 'hero', 'renamed');
    expect(result.fieldFormats['other.title']).toBe('plain');
    expect(result.fieldFormats['renamed.title']).toBe('richText');
  });

  it('元の data / fieldFormats を変更しない（immutable）', () => {
    const data = { hero: { title: 'X' } };
    const fieldFormats: Record<string, ComposableFieldFormat> = { 'hero.title': 'plain' };
    renameFieldPrefix(data, fieldFormats, 'hero', 'hero01');
    expect(data).toHaveProperty('hero');
    expect(fieldFormats).toHaveProperty('hero.title');
    expect(fieldFormats).not.toHaveProperty('hero01.title');
  });
});
