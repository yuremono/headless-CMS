# CMS エージェント操作（CLI / MCP）

AI エージェントやスクリプトから CMS コンテンツを操作するための仕組み。
Admin Root と同じ経路 — **Admin API（PATCH + publish）** — のみを使い、DB への直接書き込みは行わない。

## 構成

| レイヤ | パス | 役割 |
|--------|------|------|
| 共有ライブラリ（推奨） | `packages/headless-cms-agent/` (`@headless/cms-agent`) | Admin API HTTP クライアント、コンテンツ取得・保存・公開、フィールド操作（`@/` 非依存・自己完結） |
| 共有ライブラリ（後方互換） | `lib/cms-agent/` | 上記 package への re-export。既存 `@/lib/cms-agent` import 用 |
| CLI | `scripts/cms-cli.ts` → `npm run cms -- …` | ターミナルからの操作 |
| MCP（推奨） | `packages/headless-cms-mcp/` → `npm run cms:mcp` | Cursor 等の MCP クライアントからツール呼び出し |
| MCP（レガシー） | `mcp/headless-cms/` | 旧配置。新規は packages 版を使う |

`@headless/cms-agent` は CLI・MCP・フロント repo 同梱版の共通ライブラリ。管理画面の `adminFetch` とは独立したサーバー専用実装。

> **packages 版が推奨** — MCP は repo root の `@/` alias なしで `packages/headless-cms-mcp` から起動できる。フロント repo 単体でも `@headless/cms-agent` + `@headless/cms-mcp` を workspace 依存で同梱可能。

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

**詳細ガイド:** [cms-mcp.md](./cms-mcp.md)（セットアップ・Cursor 設定・ツール一覧・トラブルシュート）

1. リポジトリルートで `npm install`（`tsx` が devDependency に含まれる）
2. Cursor Settings → MCP、または `~/.cursor/mcp.json` にサーバー定義を追加
3. `npm run cms:mcp` で起動するか、`cwd` をリポジトリルートにして npm script 経由で起動

**案件フロント開発者**は CMS repo を clone せず、フロント repo 同梱の `cms-mcp/` から `npm run cms:mcp` を使える（[cms-mcp.md §リポジトリ別](./cms-mcp.md)）。

レガシー README: [mcp/headless-cms/README.md](../../mcp/headless-cms/README.md)

## 制約

- **Admin API 経由のみ** — Prisma / raw SQL / `migrate reset` / `seed` は CLI 側でブロック
- 配信 API への反映は `publish` 操作で `revalidateTag` が走る（Admin Root の公開と同じ）
- アセット削除・メンバー / サイト / Webhook 操作は対象外
