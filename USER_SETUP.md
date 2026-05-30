# あなたがやること（1 回だけ）

## 1. DB パスワードを置く

```bash
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
2. **メイン作業ページ（本番）:** https://0529headless-cms.vercel.app/sites/main-site/developer
3. コンテンツを **公開**
4. https://0529headless-front.vercel.app を **再読み込み**

`headless-cms.vercel.app` / `2020.headless-cms.talks.smakosh.com` は別プロジェクトに紐づいていると 404 になります（[AGENTS.md](./AGENTS.md) 参照）。

コピペ用 env: `scripts/vercel-env-paste.md`

---

## 2 回目以降（コードを直したあと）

```bash
npm run deploy
```

フロントも出す場合: `npm run deploy:all`（[AGENTS.md](./AGENTS.md) の「本番デプロイ」を参照）
