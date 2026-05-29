# ヘッドレス型 簡易CMS

制作会社向けのヘッドレス CMS 基盤です。コンテンツの作成・編集・JSON API 配信に専念し、表示フロントエンドとは分離します。

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local の DATABASE_URL 等を編集

npx prisma migrate deploy   # 開発初回は npx prisma migrate dev でも可
npx tsx prisma/seed.ts      # または npm run prisma:seed
```

デモログインは `.env.example` の `ADMIN_DEMO_EMAIL` / `ADMIN_DEMO_PASSWORD` を参照してください。

## コマンド

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー（管理画面 + API） |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npm test` | Vitest 単体テスト（236 件） |
| `npm run test:coverage` | カバレッジ付き（`lib/**` + `app/api/**`、約 88%） |

DB 関連: `npx prisma migrate dev` / `npx prisma studio` / `npx tsx prisma/seed.ts`

## 管理画面

- URL: [http://localhost:3000/login](http://localhost:3000/login)（`npm run dev` 起動後）
- ダッシュボード: [http://localhost:3000/](http://localhost:3000/)

## Preview デモ

配信 API / プレビュー API を検証する静的デモ: [examples/preview/](examples/preview/README.md)

1. CMS を `npm run dev`（`:3000`）
2. `examples/preview/` を別ポートで配信（例: `python3 -m http.server 3001`）
3. `.env.local` に `FRONTEND_BASE_URL=http://localhost:3001` を設定すると管理画面のプレビューリンクと連携

本番（Vercel + Supabase）: [USER_SETUP.md](./USER_SETUP.md)（**DB パスワード 1 行 + スクリプト 1 本**）

詳細・seed 後の ID は [examples/preview/README.md](examples/preview/README.md) を参照。

## 公開サイト（案件フロント）

- 公開サイトは **プレーンな HTML + JavaScript** から CMS の JSON 配信 API を `fetch` する構成でよい
- CMS 側で `FRONTEND_BASE_URL`（CORS 許可）を設定し、リクエストに `x-api-key`（公開 API キー）を付与する
- 管理画面で **公開** すると API は即時更新される。ページ再読み込みで最新（CSR。ビルド不要）
- Astro 等でビルド時に API を取得する SSG は、将来・代替の選択肢
- 接続例: [examples/preview/](examples/preview/README.md)（同梱の参考クライアント。案件納品物ではない）

**静的 HTML プレビュー（計画・最優先）:** 管理画面でコンテンツを保存・公開したとき、同梱デモ用の静的 HTML を `examples/preview/` に自動生成する機能を追加予定です。編集直後に生成ファイルを開くだけで表示確認でき、本番の配信は従来どおり JSON API のみです（案件フロントへの HTML 納品はありません）。

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [AGENTS.md](AGENTS.md) | エージェント向けガイド |
| [SPEC.md](SPEC.md) | 要件定義 |
| [docs/agents/project.md](docs/agents/project.md) | 技術スタック・ディレクトリ・実装状態 |
| [docs/agents/architecture.md](docs/agents/architecture.md) | API・DB・セキュリティ |
| [docs/agents/coding.md](docs/agents/coding.md) | コーディング規約 |
| [docs/agents/handoff-2026-05-29-2247JST.md](docs/agents/handoff-2026-05-29-2247JST.md) | 引き継ぎスナップショット（最新） |
| [docs/delivery-guide.md](docs/delivery-guide.md) | 案件納品・フロント接続 |
| [docs/vercel-deploy.md](docs/vercel-deploy.md) | Vercel + Supabase デプロイ手順 |
