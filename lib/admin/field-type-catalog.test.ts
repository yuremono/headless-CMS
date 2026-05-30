import { describe, expect, it } from 'vitest';
import {
  buildJsonPath,
  createFieldsFromSelection,
  expandImageBundle,
  migratePathsOnPrefixChange,
  previewPathsForSelection,
  validatePrefix,
} from './field-type-catalog';

describe('buildJsonPath', () => {
  it('prefix 空のとき suffix のみ', () => {
    expect(buildJsonPath('', 'title')).toBe('title');
    expect(buildJsonPath('  ', 'text')).toBe('text');
  });

  it('prefix があるときドット結合', () => {
    expect(buildJsonPath('hero', 'title')).toBe('hero.title');
    expect(buildJsonPath(' hero ', 'image.url')).toBe('hero.image.url');
  });
});

describe('expandImageBundle', () => {
  it('画像チェック相当で 3 suffix を生成する', () => {
    const bundle = expandImageBundle('hero');

    expect(bundle).toHaveLength(3);
    expect(bundle.map((row) => row.jsonPath)).toEqual([
      'hero.image.url',
      'hero.image.alt',
      'hero.href',
    ]);
    expect(bundle.every((row) => row.bundle === 'image')).toBe(true);
  });

  it('prefix 空でも 3 件', () => {
    const bundle = expandImageBundle('');
    expect(bundle.map((row) => row.jsonPath)).toEqual(['image.url', 'image.alt', 'href']);
  });
});

describe('validatePrefix', () => {
  it('空は有効', () => {
    expect(validatePrefix('').valid).toBe(true);
  });

  it('英字始まりセグメントは有効', () => {
    expect(validatePrefix('hero').valid).toBe(true);
    expect(validatePrefix('hero.block').valid).toBe(true);
  });

  it('不正文字は無効', () => {
    expect(validatePrefix('hero-1').valid).toBe(false);
    expect(validatePrefix('1hero').valid).toBe(false);
  });
});

describe('createFieldsFromSelection', () => {
  it('タイトル・テキスト・画像をまとめて追加できる', () => {
    const rows = createFieldsFromSelection(
      'hero',
      { title: true, text: true, image: true },
      { hero: { title: '見出し', text: '本文', image: { url: 'u', alt: 'a' }, href: 'https://x' } },
    );

    expect(rows).toHaveLength(5);
    expect(rows[0]?.type).toBe('title');
    expect(rows[1]?.type).toBe('text');
    expect(rows.slice(2).every((row) => row.bundle === 'image')).toBe(true);
  });
});

describe('migratePathsOnPrefixChange', () => {
  it('prefix 変更時に jsonPath と値を移行する', () => {
    const fields = createFieldsFromSelection('hero', { title: true }, { hero: { title: '旧' } });
    fields[0]!.value = '編集中';

    const migrated = migratePathsOnPrefixChange('hero', 'main', fields, {
      hero: { title: '旧' },
      main: { title: '新DB' },
    });

    expect(migrated[0]?.jsonPath).toBe('main.title');
    expect(migrated[0]?.value).toBe('編集中');
  });

  it('フィールド値が空なら sourceData の旧パスから読む', () => {
    const fields = createFieldsFromSelection('hero', { text: true }, {});
    fields[0]!.value = '';

    const migrated = migratePathsOnPrefixChange('hero', 'block', fields, {
      hero: { text: '本文' },
    });

    expect(migrated[0]?.jsonPath).toBe('block.text');
    expect(migrated[0]?.value).toBe('本文');
  });
});

describe('previewPathsForSelection', () => {
  it('画像 ON で 3 パスをプレビュー', () => {
    expect(
      previewPathsForSelection('hero', { title: false, text: false, image: true }),
    ).toEqual(['hero.image.url', 'hero.image.alt', 'hero.href']);
  });
});
