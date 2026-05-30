import { describe, expect, it } from 'vitest';
import {
  buildJsonPath,
  createFieldsFromSelection,
  expandImageBundle,
  migratePathsOnPrefixChange,
  previewPathsForSelection,
  restoreGroupsFromData,
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

describe('restoreGroupsFromData', () => {
  let groupCounter = 0;
  const createId = () => `group-${++groupCounter}`;

  it('空 data では空配列', () => {
    expect(restoreGroupsFromData({}, createId)).toEqual([]);
  });

  it('title / text / 画像バンドルを prefix ごとに 1 グループへ復元', () => {
    const data = {
      card3_1: {
        title: '見出し',
        text: '本文',
        image: { url: 'https://img', alt: 'alt' },
        href: 'https://link',
      },
      test: { title: 'テスト' },
    };

    const groups = restoreGroupsFromData(data, createId);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.prefix).toBe('card3_1');
    expect(groups[0]?.fields.map((field) => field.type)).toEqual([
      'title',
      'text',
      'imageUrl',
      'imageAlt',
      'href',
    ]);
    expect(groups[0]?.fields[0]?.value).toBe('見出し');
    expect(groups[1]?.prefix).toBe('test');
    expect(groups[1]?.fields).toHaveLength(1);
    expect(groups[1]?.fields[0]?.type).toBe('title');
  });

  it('画像バンドルの一部だけ存在しても 3 フィールドを復元', () => {
    const groups = restoreGroupsFromData(
      { hero: { image: { url: 'https://img' } } },
      createId,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.fields.filter((field) => field.bundle === 'image')).toHaveLength(3);
    expect(groups[0]?.fields.find((field) => field.type === 'imageUrl')?.value).toBe('https://img');
  });

  it('同一 prefix のフィールドは 1 グループにマージ', () => {
    const groups = restoreGroupsFromData(
      { hero: { title: 'A', text: 'B' } },
      createId,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.prefix).toBe('hero');
    expect(groups[0]?.fields.map((field) => field.type)).toEqual(['title', 'text']);
  });

  it('prefix 空のルートフィールドも復元', () => {
    const groups = restoreGroupsFromData({ title: 'ルート', text: '本文' }, createId);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.prefix).toBe('');
    expect(groups[0]?.fields.map((field) => field.type)).toEqual(['title', 'text']);
  });
});
