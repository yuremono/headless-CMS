# 案件納品ガイド

**最終更新:** 2026-05-29  
**対象:** 制作会社がクライアント案件ごとに CMS をセットアップ・運用する際の手順書

---

## 1. CMS 概要

本 CMS は **ヘッドレス型** のコンテンツ管理基盤です。HTML やデザインは出力せず、構造化 JSON を API で配信します。表示・ルーティング・スタイルは各案件のフロントエンド側で実装します。

| 原則 | 内容 |
|------|------|
| ヘッドレス | CMS は JSON のみ返却。ページ描画はフロント案件の責務 |
| 1 案件 1 デプロイ | クライアント案件ごとに CMS を独立デプロイ（マルチテナント SaaS ではない） |
| 1 デプロイ 1 サイト | 基本 1 サイト。API・管理画面をシンプルに保つ |
| スキーマ駆動 | 管理画面・配信 API・バリデーションが同一スキーマを参照 |

### 提供するもの

- 管理画面（コンテンツ編集・公開・メディア・プレビューリンク）
- 配信 API（公開データの取得）
- プレビュー API（下書きの確認）
- 管理 API（外部ツール・将来の AI 連携向け）

### 提供しないもの

- 公開サイトの HTML / CSS / JavaScript
- テーマ一体型のページ表示

同梱の [examples/preview/](../examples/preview/README.md) は API 検証用デモであり、案件フロントではありません。

---

## 2. 初期セットアップ

### 2.1 前提

- Node.js（プロジェクトの `package.json` に準拠）
- PostgreSQL（ローカル開発）または Supabase（本番推奨）
- デプロイ先（例: Vercel）

### 2.2 インストール

```bash
npm install
cp .env.example .env.local   # 本番はホスティング側の環境変数に設定
```

`.env.local`（またはホスティングの Environment Variables）で最低限次を設定します。変数名の詳細は [.env.example](../.env.example) を参照してください。

| 変数 | 用途 |
|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `APP_URL` | CMS の公開 URL（例: `https://cms.example.com`） |
| `FRONTEND_BASE_URL` | 案件フロントの origin（プレビューリンク・CORS 用） |
| `ADMIN_DEMO_EMAIL` / `ADMIN_DEMO_PASSWORD` | 開発・納品初期の管理画面ログイン（本番認証は Phase 3） |
| `CMS_PUBLIC_API_KEY` / `CMS_ADMIN_API_KEY` | 本番用 API キー（未設定時は開発フォールバックのみ） |
| `CMS_PREVIEW_TOKEN` または `PREVIEW_TOKEN_SECRET` | プレビュー認証 |
| `STORAGE_PROVIDER` | MVP 既定は `local`（画像はサーバー内保存） |

### 2.3 データベース

**初回（開発）**

```bash
npx prisma migrate deploy   # 開発初回は npx prisma migrate dev でも可
npx tsx prisma/seed.ts      # デモサイト・コンテンツ種類・サンプルデータ投入
```

`npm run prisma:seed` が環境によって失敗する場合は `npx tsx prisma/seed.ts` を使用してください。

**seed で作成される主な内容**

- サイト slug: `main-site`
- コンテンツ種類: `topPage`（single）/ `page`（collection）/ `news`（collection）
- サンプルコンテンツ（トップページ・about ページ・ニュース 1 件）
- 公開・管理 API キー（DB にハッシュ保存。平文は seed では出力されない）

サイトを GUI から新規作成する場合は管理画面ダッシュボードの「サイト作成」、または `POST /api/admin/sites` で行えます。作成時のみ公開・管理 API キーの平文がレスポンスに含まれます。**必ず安全な場所に控え、再表示はできません。**

### 2.4 起動

```bash
# 開発
npm run dev

# 本番相当
npm run build
npm run start
```

---

## 3. 管理画面

| 画面 | パス（`APP_URL` 基準） |
|------|------------------------|
| ログイン | `/login` |
| ダッシュボード | `/` |
| サイト概要 | `/sites/{slug}`（例: `/sites/main-site`） |

### ログイン（現行）

現時点の認証は **デモセッション** です。ログイン情報は環境変数 `ADMIN_DEMO_EMAIL` と `ADMIN_DEMO_PASSWORD` で設定します（ [.env.example](../.env.example) 参照）。

> **Phase 3（未着手）:** Supabase Auth / Auth.js による本番認証、メンバー CRUD UI、viewer 向け読取専用画面を予定しています。本番納品前に本番認証の導入を検討してください。

### 基本的な編集フロー

1. コンテンツを編集し **下書き保存**
2. 管理画面の **プレビューを開く** で下書きを確認（`FRONTEND_BASE_URL` が設定されていること）
3. **公開** 操作で配信 API に反映

---

## 4. API キーと認証

公開キーと管理キーは **必ず分離** してください。

| 種別 | ヘッダー | 権限 | 用途 |
|------|----------|------|------|
| 公開 API キー | `x-api-key` または `x-public-api-key` | 読取専用 | 案件フロント・SSG / ISR |
| 管理 API キー | `x-admin-api-key` | 読取・書込 | 管理 API・外部連携 |
| セッション | `x-session-token` または Cookie `cms_session` | 書込 | 管理画面（ブラウザ） |
| プレビュー | クエリ `previewToken` または `x-preview-token` | 下書き読取 | プレビュー環境 |

### キーの設定方法

1. **環境変数（推奨・本番）**  
   - `CMS_PUBLIC_API_KEY` / `CMS_ADMIN_API_KEY`  
   - サイト単位: `CMS_PUBLIC_API_KEY_{SITE_ID_SUFFIX}` 形式（`.env.example` 参照）

2. **DB 発行キー**  
   - サイト作成 API のレスポンス、または seed 時に DB へハッシュ保存  
   - 平文は発行時のみ。紛失時はローテーション（`POST /api/admin/sites/{siteId}/api-keys/rotate` — UI は Phase 3）

3. **開発フォールバック**  
   - `NODE_ENV !== "production"` かつ上記未設定時のみ、固定の開発用トークンが有効  
   - **本番（`NODE_ENV=production`）では必ず env または DB キーを設定すること**

### プレビュートークン

| 方式 | 設定 |
|------|------|
| 固定トークン | `CMS_PREVIEW_TOKEN`（またはサイト単位の `CMS_PREVIEW_TOKEN_{SITE_ID_SUFFIX}`） |
| 署名付きトークン | `PREVIEW_TOKEN_SECRET` を設定すると管理画面リンクは `pt.v1.{payload}.{sig}` 形式（24 時間 TTL） |

---

## 5. 配信 API

ベース URL: `{APP_URL}/api/sites/{siteId}/content/{contentType}`

`{siteId}` には **サイト UUID** または **slug**（例: `main-site`）を指定できます。

### 公開データの取得

**published** ステータスのみ返却します。認証ヘッダーに公開 API キーを付与します。

```bash
# 一覧（collection 種別: page, news など）
curl -s \
  -H "x-api-key: {PUBLIC_API_KEY}" \
  "{APP_URL}/api/sites/{siteId}/content/page?limit=10&offset=0"

# slug で 1 件（collection）
curl -s \
  -H "x-api-key: {PUBLIC_API_KEY}" \
  "{APP_URL}/api/sites/{siteId}/content/page?slug=about"

# ID で 1 件
curl -s \
  -H "x-api-key: {PUBLIC_API_KEY}" \
  "{APP_URL}/api/sites/{siteId}/content/topPage/{contentId}"
```

### クエリパラメータ

| パラメータ | 用途 |
|------------|------|
| `slug` | collection 種別のスラッグ指定 |
| `limit` / `offset` | 一覧ページネーション |

### レスポンス概要

単一取得:

```json
{
  "id": "...",
  "contentType": "topPage",
  "status": "published",
  "dataJson": {
    "seo": { "title": "..." },
    "sections": [
      { "type": "textBlock", "id": "sec_...", "data": { "title": "...", "body": "<p>...</p>" } }
    ]
  }
}
```

一覧:

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

フロント案件では `dataJson.sections` の `type` に応じてコンポーネントを映射します。CMS 側に表示 CSS は含まれません。

---

## 6. プレビュー API

下書き（`draft`）を取得するには、配信 API と同じ URL に次を付与します。

```bash
curl -s \
  -H "x-api-key: {PUBLIC_API_KEY}" \
  "{APP_URL}/api/sites/{siteId}/content/topPage/{contentId}?draft=true&previewToken={PREVIEW_TOKEN}"
```

管理画面の「プレビューを開く」は `FRONTEND_BASE_URL` に対し、次のクエリを付与した URL を生成します。

| 種別 | クエリ |
|------|--------|
| single（例: topPage） | `siteId`, `contentType`, `contentId`, `previewToken` |
| collection（例: page） | `siteId`, `contentType`, `slug`, `previewToken` |

案件フロントが別 origin から fetch する場合、CMS の CORS（`middleware.mjs`）で `FRONTEND_BASE_URL` を許可する必要があります。

---

## 7. フロント案件側の接続

### 7.1 接続に必要な情報（納品時に控える）

| 項目 | 説明 |
|------|------|
| `APP_URL` | CMS の API ベース |
| `{siteId}` | サイト UUID または slug |
| `{PUBLIC_API_KEY}` | 公開 API キー |
| `{PREVIEW_TOKEN}` | ステージング / プレビュー用（本番ビルドには含めない） |
| コンテンツ種類名 | 例: `topPage`, `page`, `news` |

### 7.2 実装パターン（例）

**ビルド時取得（SSG）**

```bash
curl -s \
  -H "x-api-key: {PUBLIC_API_KEY}" \
  "{APP_URL}/api/sites/{siteId}/content/page?slug=about"
```

**ランタイム取得（SSR / ISR）**

- 同上 URL をサーバー側 fetch で呼び出す
- 公開 API キーは **サーバー環境変数** に置き、クライアント bundle に含めない

**スキーマ参照（管理 API・制作時）**

```bash
curl -s \
  -H "x-admin-api-key: {ADMIN_API_KEY}" \
  "{APP_URL}/api/admin/sites/{siteId}/schemas"
```

### 7.3 検証用デモ

同梱デモ [examples/preview/](../examples/preview/README.md) で API 接続を確認できます。

```bash
# ターミナル 1: CMS
npm run dev

# ターミナル 2: デモフロント（別ポート）
cd examples/preview && python3 -m http.server 3001
```

`.env.local` に `FRONTEND_BASE_URL=http://localhost:3001` を設定すると、管理画面プレビューリンクと連携します。

---

## 8. 運用

### 8.1 再 seed

```bash
npx tsx prisma/seed.ts
```

**注意:** 再 seed は当該サイトのコンテンツ・API キーを再生成します。

- コンテンツ ID（`contentId`）が変わる
- DB 内 API キーが再発行される（旧キーは無効）
- プレビューデモを使っている場合は [examples/preview/js/config.js](../examples/preview/js/config.js) の `siteId` / `contentId` を更新

本番データがある環境では **再 seed しない** でください。

### 8.2 バックアップ

Phase 3 の自動エクスポート UI は未実装です。DB の論理バックアップは同梱スクリプトまたは `pg_dump` 直接実行で行います。

**スクリプト（推奨）**

プロジェクトルートで実行します。`.env` または `.env.local` の `DATABASE_URL` を読み込み、`tmp/backups/` にタイムスタンプ付き `.dump` を出力します。

```bash
chmod +x scripts/backup-db.sh   # 初回のみ
./scripts/backup-db.sh
```

出力例: `tmp/backups/headless_cms-20260529-143000.dump`（PostgreSQL custom format / `-Fc`）

> **Supabase:** `pg_dump` には **Direct 接続**（ポート `5432`）の `DATABASE_URL` が必要です。アプリ runtime 用の Pooler URL（`6543`）では失敗することがあります。バックアップ前に一時的に Direct URL を `.env.local` に設定するか、環境変数で上書きしてください。

**手動（同等コマンド）**

```bash
mkdir -p tmp/backups
pg_dump "$DATABASE_URL" -Fc --no-owner --no-acl \
  -f "tmp/backups/headless_cms-$(date +%Y%m%d-%H%M%S).dump"
```

**リストア（例）**

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists tmp/backups/headless_cms-YYYYMMDD-HHMMSS.dump
```

**定期実行（例）**

cron 等で `./scripts/backup-db.sh` をスケジュールし、生成ファイルを別ストレージへ退避してください。`tmp/backups/` は Git 管理外です。

Supabase 利用時はダッシュボードの Backup 機能も併用できます。  
アップロード画像（`STORAGE_PROVIDER=local`）は `public/uploads/` 等の実装パスを別途ファイルバックアップしてください。

### 8.3 Supabase 接続

1. Supabase プロジェクトを作成し、Settings → Database で接続文字列を取得
2. **migrate / seed 用** — Direct 接続（ポート `5432`、`db.[ref].supabase.co`）を `DATABASE_URL` に設定
3. 実行:

   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seed.ts
   ```

4. **アプリ runtime 用** — Pooler 接続（ポート `6543`、`pooler.supabase.com`、`pgbouncer=true`）に `DATABASE_URL` を切替（ [.env.example](../.env.example) のコメント参照）
5. 再 seed 後はプレビューデモ等の `siteId` / `contentId` を更新

### 8.4 本番チェックリスト

- [ ] `NODE_ENV=production`
- [ ] `CMS_PUBLIC_API_KEY` / `CMS_ADMIN_API_KEY` を設定（開発フォールバックに依存しない）
- [ ] `PREVIEW_TOKEN_SECRET` または `CMS_PREVIEW_TOKEN` を設定
- [ ] `APP_URL` / `FRONTEND_BASE_URL` を本番 URL に設定
- [ ] `DATABASE_URL` は Pooler URL（runtime）
- [ ] デモパスワードを本番用に変更、または Phase 3 本番認証を導入
- [ ] 公開 API キーを案件フロントのサーバー環境変数のみに配置

---

## 9. 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [README.md](../README.md) | リポジトリ概要・クイックスタート |
| [SPEC.md](../SPEC.md) | 要件定義・Phase 計画 |
| [docs/agents/architecture.md](agents/architecture.md) | API 一覧・セキュリティ |
| [docs/agents/project.md](agents/project.md) | 技術スタック・ディレクトリ |
| [examples/preview/README.md](../examples/preview/README.md) | プレビューデモ詳細 |
| [.env.example](../.env.example) | 環境変数一覧 |

---

## 10. 制限事項（納品時の期待値）

| 項目 | 現状 |
|------|------|
| 本番認証 | デモログインのみ（Phase 3） |
| API キーローテーション | API のみ（管理 UI 未実装） |
| 操作ログ | 未実装 |
| DB バックアップ | `scripts/backup-db.sh`（手動 / cron）。自動エクスポート UI は未実装 |
| 画像ストレージ | MVP は `local`。R2 は stub |
| 権限強制 | `PHASE3_ENFORCE_ROLES=true` で有効化可能（既定オフ） |
| コンテンツ種類の GUI 追加 | Phase 2 以降（MVP は `content-types/*.json`） |

不明点は [docs/agents/handoff-2026-05-29.md](agents/handoff-2026-05-29.md) の引き継ぎメモも参照してください。
