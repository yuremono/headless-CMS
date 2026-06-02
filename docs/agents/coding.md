# コーディング・スタイリング規約

## コーディング規約

| 項目 | 規約 |
|------|------|
| TypeScript | strict 前提 |
| コンポーネント名 | PascalCase |
| セマンティッククラス | PascalCase（下記 CSS 参照） |
| lib / 関数 | camelCase |
| 型 | `interface` 優先 |
| Route Handler | 薄く保ち、ロジックは `lib/` へ |
| Prisma | `lib/db/` 経由。Route Handler から複雑クエリを書かない |
| 責務分離 | `components/admin/` と `lib/` を混在させない |
| a11y | マークアップで意識 |
| 新規クラス | Tailwind / 変数で不足時のみ追加 |

---

## CSS / スタイリング

**管理画面UI専用。** フロントエンド案件・配信コンテンツには適用しない。

### 方針

| 項目 | 規約 |
|------|------|
| 基本 | すべて Tailwind CSS v3 |
| セマンティッククラス | ルート要素にコンポーネント名と同じ **PascalCase** クラスを必ず付与（scssでのスタイルは定義しない） |

```tsx
// components/admin/SectionEditor.tsx
export function SectionEditor() {
  return <div className="SectionEditor">...</div>;
}
```

### CSS エントリ

| ファイル | 役割 |
|---------|------|
| `index.scss` | Tailwind（`@tailwind base/components/utilities`）|
| `app/layout.tsx` | 上記 CSS の読み込みを集約 |

| 禁止 | 内容 |
|------|------|
| 追加グローバルCSS | `styles/global.scss` 等を新設しない |
| コンポーネント別SCSS | 個別 `.scss` ファイルは作らない。`index.scss` に集約 |

`index.scss`は基本的には編集しない。Tailwindで指定できないスタイルや、長すぎる記述を書く場合は必ずユーザーに報告する。

### ユーティリティ・変数

- 全ての色は`/scss/index.scss`の`oklch`で書かれた既存変数を使用する。透明度は`{name}/50`,WH50などで指定。

| カテゴリ | 規約 |
|---------|------|
| 構造 | CustomClass と既存ユーティリティを優先 |
| レイアウト系 | `wid`, `PX`, `PX2`, `PY`, `MY`, `gap`, `gapH`, `BorderXY`, `BGgrad`, `TS`, `DS`, `BS`, `WTS`（`index.scss` 定義） |
| 色 | `scss/_01variables.scss` の CSS 変数 → `text-GR`, `bg-MC`, `bg-background`, `border-border` 等（`text` / `bg` / `border` / `fill` / `stroke` 共通） |
| 不透明度 | Tailwind `/NN`（例: `bg-MC/20`, `text-GR/70`）または SCSS 生成のステップ（例: `bg-GR10`, `text-TC30`） |
| 禁止 | `color-mix` |
| 任意値 | calc 以外は `[var(--name)]` ではなく `[--name]` |
| overflow | 必要時のみ。まず `overflow-clip` 系を検討 |
