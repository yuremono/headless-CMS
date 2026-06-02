# ヘッドレス型 簡易CMS

## 基本方針

- 対話と報告は日本語で行う。
- セキュリティを最優先する。秘密情報をリポジトリへ書かない。
- 調査・編集・削除は最小差分で行う。
- ユーザー指示なしにブラウザ確認・ビルド・テストは実行しない。
- shell コマンドは `rtk` を前置する。
- puppeteer は使用しない。

## 作業対象

現在の管理画面は次の2ページのみ。

| 用途 | ファイル | URL |
|------|----------|-----|
| 管理画面 | `app/page.tsx` | `/` |
| ログイン | `app/login/page.tsx` | `/login` |

## DB 共有運用

ローカルと本番は同一 Supabase DB（`portfolio-cms` / schema `headless_cms`）を共有する。ローカル編集は本番データに反映される。

禁止:

- `npx prisma migrate reset`
- `npx tsx prisma/seed.ts`
- `npm run prisma:seed`
- その他 seed 相当の再投入

スキーマ変更時のみ [docs/vercel-deploy.md](./docs/vercel-deploy.md) に従い、Direct 接続で `npx prisma migrate deploy` を実行する。

## 参照ドキュメント

| 目的 | ファイル |
|------|----------|
| プロジェクト構成・コマンド | [docs/agents/project.md](./docs/agents/project.md) |
| API・DB・セキュリティ | [docs/agents/architecture.md](./docs/agents/architecture.md) |
| 管理画面 UI / CSS | [docs/agents/coding.md](./docs/agents/coding.md) |
| CMS CLI | [docs/agents/cms-cli.md](./docs/agents/cms-cli.md) |
| CMS MCP | [docs/agents/cms-mcp.md](./docs/agents/cms-mcp.md) |
| 本番デプロイ | [docs/vercel-deploy.md](./docs/vercel-deploy.md) |

## コマンド

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npm test` | Vitest 単体テスト |
| `npm run test:coverage` | カバレッジ付きテスト |
| `npm run deploy` | CMS 本番デプロイ |
| `npm run cms -- ...` | CMS CLI |
| `npm run cms:mcp` | CMS MCP サーバー |
