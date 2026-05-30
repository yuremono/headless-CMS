# CMS CLI

developer ページと同等の CMS 操作をコマンドラインから実行するツール。
Admin API（PATCH + publish）経由で操作し、DB の直叩きは行わない。

## 起動方法

```bash
npm run cms -- <group> <command> [options]
```

`npm run dev` で開発サーバーを起動しておくか、`CMS_BASE_URL` に本番 URL を指定して使用する。

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `CMS_ADMIN_API_KEY` | 管理 API キー。本番では必須 | 開発環境のみ `admin-dev-key` にフォールバック |
| `CMS_BASE_URL` | API サーバーの URL | `APP_URL` → `http://localhost:3000` の順でフォールバック |
| `APP_URL` | `CMS_BASE_URL` が未設定の場合のフォールバック | — |

`.env.local` が優先的に読み込まれる（次に `.env`）。

## コマンド一覧

### content get — コンテンツ取得

```bash
npm run cms -- content get [--site <site>] [--type <type>] [--id <id>]
```

- `--id` 省略時はリスト（全件）を返す
- `--id` 指定時は単一レコードを返す

**例:**

```bash
npm run cms -- content get --site main-site --type topPage
npm run cms -- content get --site main-site --type topPage --id clxxxxx
```

---

### content save — 下書き保存

```bash
npm run cms -- content save --file data.json [--site <site>] [--type <type>] [--id <id>] [--draft]
```

- `--file` に JSON ファイルパスを指定
- ファイル形式は `{ data, title?, slug?, fieldFormats?, status? }` または `{ フィールド名: 値, ... }` のフラット形式
- `--draft` を付けると `status: draft` で保存
- `--id` 省略時は単一コンテンツを自動解決

**ファイル例 (`data.json`):**

```json
{
  "title": "トップページ",
  "data": {
    "hero": {
      "title": "Welcome",
      "text": "本文テキスト",
      "image": { "url": "https://example.com/hero.jpg", "alt": "ヒーロー画像" }
    }
  },
  "fieldFormats": {
    "hero.title": "plain",
    "hero.text": "richText"
  }
}
```

**例:**

```bash
npm run cms -- content save --file ./data.json --draft
npm run cms -- content save --file ./data.json --site main-site --type topPage --id clxxxxx
```

---

### content publish — 公開

```bash
npm run cms -- content publish [--site <site>] [--type <type>] [--id <id>]
```

- PATCH 後に publish API を呼び出す（`revalidateTag` が実行され、配信 API へ即時反映）
- `--id` 省略時は単一コンテンツを自動解決

**例:**

```bash
npm run cms -- content publish
npm run cms -- content publish --site main-site --type topPage --id clxxxxx
```

---

### field set — フィールド値の更新

```bash
npm run cms -- field set --path <path> --value <value> [--site <site>] [--type <type>] [--id <id>]
```

- ドット記法で深いパスも指定可能（例: `hero.title`, `cards.0.text`）
- `--value` に JSON 文字列（`{...}`, `[...]`, `true`, `null`, 数値）を渡せば JSON として解釈

**例:**

```bash
npm run cms -- field set --path hero.title --value "Hello World"
npm run cms -- field set --path hero.image --value '{"url":"https://example.com/img.jpg","alt":"画像"}'
npm run cms -- field set --path hero.visible --value true
```

---

### field add — フィールドの追加

```bash
npm run cms -- field add --name <name> --paths <path1,path2,...> [--rich] [--site <site>] [--type <type>] [--id <id>]
```

- `--name` にフィールドグループ名、`--paths` にサブパスをカンマ区切りで指定
- `--rich` を付けると text 系フィールドを `richText` フォーマットで登録
- 画像パスは名前が `image` / `img` で終わる場合に `{ url, alt }` で初期化

**例:**

```bash
# hero グループ（title / text / image サブパス）を追加
npm run cms -- field add --name hero --paths title,text,image

# richText で登録
npm run cms -- field add --name article --paths title,body --rich
```

---

### asset upload — 画像アップロード

```bash
npm run cms -- asset upload --file <path> [--site <site>]
```

- ローカルファイルをアップロードし、アセット URL を返す
- 返り値の `data.url` を `field set --path <path> --value '{"url":"...","alt":"..."}'` で設定する

**例:**

```bash
npm run cms -- asset upload --file ./hero.jpg --site main-site
```

---

## 出力形式

成功時は stdout に JSON を出力:

```json
{
  "ok": true,
  "data": { ... }
}
```

エラー時は stderr に JSON を出力し、exit code 1:

```json
{
  "ok": false,
  "code": "api_error",
  "error": "エラーメッセージ"
}
```

## エージェント利用パターン

```bash
# 1. 現在のコンテンツを取得して dataJson を確認
npm run cms -- content get --site main-site --type topPage | jq '.data.items[0]'

# 2. フィールドを操作
npm run cms -- field set --path hero.title --value "新しいタイトル"

# 3. 下書き保存（field set は自動保存するため省略可）

# 4. 公開
npm run cms -- content publish
```

## 制限事項

- アセット削除は未対応（API 未実装）
- `migrate reset` / `seed` / raw SQL は禁止（実行しても blocked_command エラー）
- メンバー / サイト / セクション / Webhook 操作は対象外
