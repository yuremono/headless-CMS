# Vercel + Supabase 運用

CMS と案件フロントは別 Vercel プロジェクトとして運用する。

| 役割 | プロジェクト | URL |
| --- | --- | --- |
| CMS | `headless-cms` | `https://headless-cms0529.vercel.app` |
| 案件フロント | `headless-front` | `https://headless-front0529.vercel.app` |

## DB

ローカルと本番は同一 Supabase DB を共有する。`.env.local` の `DATABASE_URL` は本番と同じ DB を指す。

- `npx prisma migrate reset` は実行しない。
- seed 再投入は実行しない。
- スキーマ変更時のみ `npx prisma migrate deploy` を実行する。

## 通常デプロイ

```bash
npm run deploy
```

フロントも同時に反映する場合:

```bash
npm run deploy:all
```

## スキーマ変更を含む場合

```bash
npx prisma migrate deploy
npm run deploy
```

## 環境変数

CMS 側:

| 変数 | 内容 |
| --- | --- |
| `DATABASE_URL` | Supabase 接続文字列 |
| `AUTH_SECRET` | Auth.js secret |
| `ADMIN_DEMO_EMAIL` | デモログイン email |
| `ADMIN_DEMO_PASSWORD` | デモログイン password |
| `CMS_ADMIN_API_KEY` | Admin API キー |
| `FRONTEND_BASE_URL` | プレビュー遷移先 |

案件フロント側:

| 変数 | 内容 |
| --- | --- |
| `CMS_API_BASE_URL` | CMS の URL |
| `CMS_SITE_ID` | 互換用サイト ID |
| `PUBLIC_API_KEY` | 公開 API キー |

秘密情報は Vercel / ローカル env に置き、リポジトリに保存しない。
