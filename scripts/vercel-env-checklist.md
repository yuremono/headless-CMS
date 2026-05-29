# Vercel 環境変数チェックリスト（コピペ用）

**コピペブロック:** [vercel-env-paste.md](./vercel-env-paste.md)  
**一括セットアップ:** `.env.supabase.local` に DB パスワード → `./scripts/setup-supabase-deploy.sh`  
詳細手順: [docs/vercel-deploy.md](../docs/vercel-deploy.md)

Supabase 既存: `dvcaumqooopebexajsdw`（[ダッシュボード](https://supabase.com/dashboard/project/dvcaumqooopebexajsdw/settings/database)）

---

## CMS（Vercel → Environment Variables）

- [ ] `DATABASE_URL` — Supabase Pooler（6543）
- [ ] `APP_URL` — `https://<cms>.vercel.app`
- [ ] `CMS_AUTH_PROVIDER` — `authjs`
- [ ] `CMS_ENFORCE_ADMIN_LOGIN` — `true`
- [ ] `AUTH_SECRET`
- [ ] `PREVIEW_TOKEN_SECRET`
- [ ] `ADMIN_DEMO_PASSWORD`（seed と一致）
- [ ] `CMS_PUBLIC_API_KEY` / `CMS_ADMIN_API_KEY`（本番推奨）
- [ ] `STORAGE_PROVIDER` — `local`
- [ ] `FRONTEND_BASE_URL` — `https://0529headless-front.vercel.app`（フロント確定後）

## フロント（Vercel → Environment Variables → Redeploy）

- [ ] `CMS_API_BASE_URL` — CMS の本番 origin
- [ ] `SITE_ID` — `main-site` または UUID
- [ ] `PUBLIC_API_KEY` — 本番キー（検証のみなら `public-dev-key`）
- [ ] `CONTENT_TYPE` — `topPage`
- [ ] `CONTENT_ID` — seed 後 DB から取得した topPage ID

## ローカル一度だけ（Supabase Direct URL）

- [ ] `npx prisma migrate deploy`
- [ ] `npx tsx prisma/seed.ts`
- [ ] `CONTENT_ID` を控える

## 確認

- [ ] CMS で公開 → フロント URL を再読み込み
