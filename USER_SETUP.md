# あなたがやること（1 回だけ）

## 1. DB パスワードを置く

```bash
cd /Users/yanoseiji/projects/0529headless
cp .env.supabase.local.example .env.supabase.local
```

`.env.supabase.local` の `SUPABASE_DB_PASSWORD=` に、  
[Supabase Database settings](https://supabase.com/dashboard/project/dvcaumqooopebexajsdw/settings/database) の **Database password** を貼る。

## 2. 一括実行

```bash
./scripts/setup-supabase-deploy.sh
```

（`headless_cms` スキーマに db push / seed / Vercel env / 再デプロイまで自動。既存 Supabase の `public` は触りません）

## 3. 確認

1. https://0529headless-cms.vercel.app/login — `admin@example.com` / `HeadlessCMS-Demo-2026`
2. コンテンツを **公開**
3. https://0529headless-front.vercel.app を **再読み込み**

コピペ用 env: `scripts/vercel-env-paste.md`
