# プロジェクト概要

制作会社向けのヘッドレス CMS 基盤。CMS は管理画面・管理 API・配信 API に専念し、表示フロントエンドは別リポジトリで構築する。

## 現在の画面

| 用途 | ファイル | URL |
| --- | --- | --- |
| 管理画面 | `app/page.tsx` | `/` |
| ログイン | `app/login/page.tsx` | `/login` |

`app/(admin)` route group、ダッシュボード、コンテンツタイプ管理、メディア一覧などの旧 UI ページは使用しない。

## 技術スタック

| 項目 | 内容 |
| --- | --- |
| フレームワーク | Next.js App Router |
| 言語 | TypeScript |
| DB / ORM | Supabase PostgreSQL + Prisma |
| 認証 | Auth.js + アプリセッション |
| ストレージ | Cloudflare R2 / S3 互換 |
| スタイル | Sass + Tailwind CSS |
| テスト | Vitest |

## DB 運用

ローカルと本番は同一 Supabase DB を共有する。ローカル編集は本番データに反映される。

- `migrate reset` と seed 再投入は禁止。
- DB スキーマ変更時だけ `npx prisma migrate deploy` を使う。
- CLI / MCP は Admin API 経由で操作し、DB 直書きしない。

## 主要ディレクトリ

| パス | 内容 |
| --- | --- |
| `app/` | 画面と Route Handler |
| `app/api/` | 管理 API・配信 API・Auth API |
| `components/admin/` | 管理画面コンポーネント |
| `lib/content/` | コンテンツ保存・配信ロジック |
| `lib/auth/` | 認証・権限 |
| `lib/storage/` | 画像アップロード |
| `packages/headless-cms-agent/` | CLI / MCP 共通ライブラリ |
| `packages/headless-cms-mcp/` | MCP サーバー |
| `prisma/` | Prisma schema / migrations |
| `scss/` | Tailwind + CustomClass |

## 主要コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npm test` | 単体テスト |
| `npm run test:coverage` | カバレッジ測定 |
| `npm run deploy` | CMS 本番デプロイ |
| `npm run deploy:front` | 案件フロント本番デプロイ |
| `npm run deploy:all` | CMS + 案件フロント本番デプロイ |
| `npm run cms -- ...` | CMS CLI |
| `npm run cms:mcp` | CMS MCP サーバー |

## 関連ドキュメント

| 用途 | ファイル |
| --- | --- |
| アーキテクチャ | `docs/agents/architecture.md` |
| DOM / CSS ルール | `docs/agents/coding.md` |
| CLI | `docs/agents/cms-cli.md` |
| MCP | `docs/agents/cms-mcp.md` |
| デプロイ | `docs/vercel-deploy.md` |
