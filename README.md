# ヘッドレス型 簡易CMS

制作会社向けのヘッドレス CMS 基盤です。コンテンツの作成・編集・JSON API 配信に専念し、表示フロントエンドとは分離します。

**メイン作業ドキュメント:** [AGENTS.md](./AGENTS.md)（セットアップ・コマンド・デプロイ・作業 URL）

| 環境 | developer ページ（composable 編集） |
|------|-------------------------------------|
| ローカル | http://localhost:3000/sites/main-site/developer |
| 本番 | https://headless-cms0529.vercel.app/sites/main-site/developer |

> **【重要】ローカルと本番は同一 DB を共有しています。** `.env.local` の `DATABASE_URL` が本番 Supabase（`portfolio-cms` / schema `headless_cms`）を指すため、`localhost:3000` の編集は即座に本番へ反映されます。`prisma migrate reset` / seed の再実行は本番データを壊すので禁止。詳細は [AGENTS.md](./AGENTS.md) の「DB 共有運用」を参照。

## クイックスタート

```bash
npm install
cp .env.example .env.local
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [AGENTS.md](AGENTS.md) | **メイン** — 作業 URL・コマンド・デプロイ・エージェント規約 |
| [SPEC.md](SPEC.md) | 要件定義 |
| [docs/agents/project.md](docs/agents/project.md) | 技術スタック・ディレクトリ |
| [docs/agents/architecture.md](docs/agents/architecture.md) | API・DB・セキュリティ |
| [docs/agents/cms-mcp.md](docs/agents/cms-mcp.md) | **MCP 使い方** — Cursor 連携・AI エージェント操作 |
| [docs/agents/cms-agent.md](docs/agents/cms-agent.md) | CLI / MCP 構成・環境変数 |
| [USER_SETUP.md](USER_SETUP.md) | 本番初回セットアップ |

案件フロント開発者が CMS を AI 編集する場合は **フロント repo 同梱の MCP** を使う（CMS clone 不要）。詳細は [docs/agents/cms-mcp.md](docs/agents/cms-mcp.md)。
