# ヘッドレス型 簡易CMS

制作会社向けのヘッドレス CMS 基盤です。コンテンツの作成・編集・JSON API 配信に専念し、表示フロントエンドとは分離します。

**メイン作業ドキュメント:** [AGENTS.md](./AGENTS.md)（セットアップ・コマンド・デプロイ・作業ルール）

## メイン作業ページ

現在使用する管理画面は Admin Root とログインページのみです。

| 環境 | URL |
|------|-----|
| ローカル | http://localhost:3000/ |
| ログイン | http://localhost:3000/login |
| 本番 | https://headless-cms0529.vercel.app/ |
| 本番ログイン | https://headless-cms0529.vercel.app/login |

> **重要:** ローカルと本番は同一 DB を共有しています。`.env.local` の `DATABASE_URL` が本番 Supabase（`portfolio-cms` / schema `headless_cms`）を指すため、`localhost:3000` の編集は即座に本番へ反映されます。`prisma migrate reset` / seed の実行は禁止です。詳細は [AGENTS.md](./AGENTS.md) の「DB 共有運用」を参照してください。

## セットアップ

```bash
npm install
cp .env.example .env.local
npx prisma migrate deploy
```

`npm run dev` 起動後に http://localhost:3000/ を開きます。

## 主なコマンド

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npm test` | Vitest 単体テスト |
| `npm run test:coverage` | カバレッジ付きテスト |
| `npm run deploy` | CMS 本番デプロイ |

DB スキーマ変更時のみ、[AGENTS.md](./AGENTS.md) と [docs/vercel-deploy.md](./docs/vercel-deploy.md) の手順に従ってください。
