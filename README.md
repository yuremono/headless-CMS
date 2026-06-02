# ヘッドレス型 簡易CMS

ヘッドレス CMS 基盤です。コンテンツの作成・編集・JSON API 配信に専念し、表示フロントエンドとは分離します。

## メイン作業ページ

| 環境 | URL |
|------|-----|
| ローカル | http://localhost:3000/ |
| ログイン | http://localhost:3000/login |
| 本番 | https://headless-cms0529.vercel.app/ |
| 本番ログイン | https://headless-cms0529.vercel.app/login |

## 重要な運用

ローカルと本番は同一 Supabase DB を共有しています。`localhost:3000` の編集は本番データへ反映されます。

`prisma migrate reset` と seed は実行禁止です。DB スキーマ変更時のみ [docs/vercel-deploy.md](./docs/vercel-deploy.md) に従って `migrate deploy` を実行します。

## 主なコマンド

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npm test` | Vitest 単体テスト |
| `npm run test:coverage` | カバレッジ付きテスト |
| `npm run deploy` | CMS 本番デプロイ |

---

https://github.com/yuremono/headless-CMS
