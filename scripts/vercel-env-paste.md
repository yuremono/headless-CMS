# Vercel 環境変数（コピペ用）

Supabase: [portfolio-cms](https://supabase.com/dashboard/project/dvcaumqooopebexajsdw/settings/general)（`dvcaumqooopebexajsdw`）

自動セットアップ: `SUPABASE_DB_PASSWORD` を `.env.supabase.local` に書いて `./scripts/setup-supabase-deploy.sh`

---

## CMS（プロジェクト: `headless-cms`）

```
DATABASE_URL=postgresql://postgres.dvcaumqooopebexajsdw:＜DBパスワード＞@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
APP_URL=https://headless-cms0529.vercel.app
CMS_AUTH_PROVIDER=authjs
CMS_ENFORCE_ADMIN_LOGIN=true
PHASE3_ENFORCE_ROLES=true
AUTH_SECRET=62cac86cb7be53e8cfa53a6e63409ea9693620506e8a98757a40de0caa81cfb8
PREVIEW_TOKEN_SECRET=ea9b1c8a195b1d14ef3f9b62de80277315e7cb12828f7e9bf6704b9ed64cc2b6
ADMIN_DEMO_EMAIL=admin@example.com
ADMIN_READONLY_PASSWORD=＜read-only password＞
ADMIN_EDITOR_PASSWORD=＜editor password＞
CMS_PUBLIC_API_KEY=public-dev-key
STORAGE_PROVIDER=local
FRONTEND_BASE_URL=https://headless-front0529.vercel.app
```

Direct（migrate/seed ローカルのみ・ユーザー名は `postgres`）:

```
postgresql://postgres:＜DBパスワード＞@db.dvcaumqooopebexajsdw.supabase.co:5432/postgres?sslmode=require
```

---

## フロント（プロジェクト: `headless-front`）

```
CMS_API_BASE_URL=https://headless-cms0529.vercel.app
SITE_ID=main-site
PUBLIC_API_KEY=public-dev-key
CONTENT_TYPE=topPage
CONTENT_ID=＜seed 後に setup スクリプトが出力＞
```
