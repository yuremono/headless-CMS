# CMS エージェント操作（CLI / MCP）

AI エージェントやスクリプトから CMS コンテンツを操作するための仕組み。
developer ページと同じ経路 — **Admin API（PATCH + publish）** — のみを使い、DB への直接書き込みは行わない。

## 構成

| レイヤ | パス | 役割 |
|--------|------|------|
| 共有ライブラリ | `lib/cms-agent/` | Admin API HTTP クライアント、コンテンツ取得・保存・公開、フィールド操作 |
| CLI | `scripts/cms-cli.ts` → `npm run cms -- …` | ターミナルからの操作 |
| MCP | `mcp/headless-cms/` → `npm run cms:mcp` | Cursor 等の MCP クライアントからツール呼び出し |

`lib/cms-agent` は CLI と MCP の両方が import する。管理画面の `adminFetch` とは独立したサーバー専用実装。

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `CMS_ADMIN_API_KEY` | 本番で必須 | 開発: `admin-dev-key` | 管理 API キー（`x-api-key` ヘッダー） |
| `CMS_BASE_URL` | いいえ | `http://localhost:3000` | CMS オリジン（ローカル or 本番 URL） |
| `CMS_SITE_ID` | いいえ | `main-site` | MCP のデフォルトサイト slug（CLI は `--site` で指定） |

`.env.local` → `.env` の順で読み込まれる。

## クイックスタート

### CLI

```bash
# 開発サーバー起動中、または CMS_BASE_URL に本番 URL を設定
npm run cms -- content get --site main-site --type topPage
npm run cms -- field set --path hero.title --value "Hello"
npm run cms -- content publish
```

コマンド一覧・ファイル形式・出力形式: [cms-cli.md](./cms-cli.md)

### MCP（Cursor）

1. リポジトリルートで `npm install`（`tsx` が devDependency に含まれる）
2. Cursor Settings → MCP、または `~/.cursor/mcp.json` にサーバー定義を追加
3. `npm run cms:mcp` で起動するか、`cwd` をリポジトリルートにして npm script 経由で起動

設定例・利用可能ツール・典型ワークフロー: [mcp/headless-cms/README.md](../../mcp/headless-cms/README.md)

## 制約

- **Admin API 経由のみ** — Prisma / raw SQL / `migrate reset` / `seed` は CLI 側でブロック
- 配信 API への反映は `publish` 操作で `revalidateTag` が走る（developer ページの公開と同じ）
- アセット削除・メンバー / サイト / Webhook 操作は対象外
