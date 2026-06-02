# アーキテクチャ・データ・API

## 運用形態

**案件ごとにCMSを別デプロイ**（1案件 ≒ 1CMS）。マルチテナントSaaSは想定しない。

## API 二層分離

| 種別 | パス例 | 利用者 | 認証 |
|------|--------|--------|------|
| 配信API | `/api/sites/{siteId}/content/{contentType}/...` | 各種フロントエンド | 公開APIキー |
| 管理API | `/api/admin/sites/{siteId}/content/{contentType}/...` | 管理画面・AI・外部ツール | 管理APIキー / セッション |

| ルール | 内容 |
|--------|------|
| キー分離 | 公開APIキーと管理APIキーは必ず分離 |
| 公開データ | 配信APIは `status: published` のみ返却 |
| プレビュー | `draft=true&previewToken=xxxx` で下書き取得 |
| プレビューUI | 管理画面からプレビューURLリンクを表示 |

## ヘッドレス・スキーマ・サイト分離

| 項目 | CMS側 | フロントエンド案件側 |
|------|-------|----------------------|
| ページ描画 | しない | 実装する |
| セクション型 | データ構造テンプレート | `type` でコンポーネント映射 |
| CSS | 配信データに持たせない | デザイン・レイアウトを実装 |
| スキーマ | JSON定義 → UI / API / バリデーション / AI が参照 | 取得して表示 |
| デプロイ | 案件ごとに独立 | `examples/preview/` は同梱デモのみ |

スキーマ取得: `GET /api/admin/sites/{siteId}/schemas`

---

## コンテンツ種類（content type）

AI/LLMの「モデル」と混同しない。DBテーブル名は `content_models`。

| 段階 | 方式 |
|------|------|
| MVP | `content-types/*.json` でスキーマ定義 → デプロイ時取り込み |
| MVP | 管理画面GUIでスキーマに基づく編集（**GUI必須**） |
| Phase 2 | GUIからコンテンツ種類・フィールドを追加・変更 |

---

## データ設計

### コンテンツ種類

| type | 用途 | 例 |
|------|------|-----|
| `single` | 1件固定 | トップページ、会社概要設定 |
| `collection` | 複数件 | お知らせ、ブログ、FAQ |

### フィールド型（MVP）

```txt
text / textarea / richText / number / boolean
image / file / url / date / select
reference / array / object / sectionArray
```

- `richText`: 保存形式は **HTML**。CMS側でサニタイズ（XSS対策）
- 新フィールド型追加時は **スキーマ定義・バリデーション・管理UI・APIシリアライズ** の4箇所を揃える

### セクション型

```json
{ "type": "hero", "id": "sec_hero_001", "data": { ... } }
```

| 要件 | 内容 |
|------|------|
| ID | 安定した一意識別子（AI差分更新の前提） |
| 操作 | 追加 / 並び替え / 複製 / 非表示 / 削除 |
| 初期テンプレート | hero, titleGroup, textBlock, imageText, cardList, featureList, faq, cta, newsList, gallery, companyProfile, access, contactLead |

### コンテンツ保存

| 項目 | 内容 |
|------|------|
| 保存先 | `contents.data_json`（本文・セクション・SEO） |
| SEO | title, description, ogTitle, ogDescription, ogImage, canonicalUrl, noindex |
| ステータス | draft / published / unpublished |
| MVP公開制御 | `status=published` のみ配信APIが返却 |

### DB（MVPで作らない）

`content_versions` / `content_fields` — MVPは `contents` + `content_models.schema_json` で足りる

---

## セキュリティ

| 項目 | 方針 |
|------|------|
| 認証 | 管理画面ログイン（デモ / **Auth.js**）+ APIキー必須 |
| APIキー | 公開=読取専用、管理=書込可 |
| CORS | サイトごとに許可ドメイン設定 |
| 入力 | バリデーション、SQLi / XSS 対策 |
| richText | HTMLサニタイズ必須 |
| ファイル | MIME・サイズ制限 |
| 秘密情報 | リポジトリ禁止。`.env.example` は変数名のみ |

---

## 管理画面

| 項目 | 方針 |
|------|------|
| 対象 | 制作者・クライアント編集者 |
| GUI | **必須**（JSON定義のみで編集画面を省略しない） |
| 優先 | 編集の安全性（デザイン自由度は抑える） |
| 項目制限 | スキーマで必須・任意・非表示を制御 |
| セクションUI | 追加 / 並び替え / 開閉 / 複製 / 削除 / 非表示 / 型別フォーム |
| 公開フロー | 下書き保存 → プレビューリンク → 公開 |
| **RSC データ取得** | Server Component は管理 API を HTTP で呼ばず、`lib/admin/loader.ts` → `lib/db/*` を直接呼び出す |
| **Client 操作** | `ContentForm` / `ComposableContentForm` 等は `adminFetch` + `x-session-token`（または cookie `cms_session`） |

---

## API 設計

### 実装済みエンドポイント（Phase 1+2）

`{siteId}` は UUID または slug（`lib/db/site-resolver` で解決）。

| 種別 | メソッド・パス | 備考 |
|------|---------------|------|
| 配信 | `GET /api/sites/{siteId}/content/{contentType}` | `slug` / `limit` / `offset` クエリ可。`published` のみ |
| 配信 | `GET /api/sites/{siteId}/content/{contentType}/{id}` | |
| プレビュー | 上記 + `?draft=true&previewToken=xxxx` | 下書き取得 |
| 管理（全体） | `GET /api/admin/sites` | サイト一覧 |
| 管理（全体） | `POST /api/admin/sites` | サイト新規作成（`content-types` 取り込み + API キー発行。平文キーはレスポンスのみ） |
| 管理（全体） | `GET /api/admin/dashboard` | ダッシュボード用スナップショット |
| 管理 | `GET /api/admin/sites/{siteId}` | `{ siteId, schemas }` |
| 管理 | `GET /api/admin/sites/{siteId}/schemas` | スキーマ一覧 |
| 管理 | `GET /api/admin/sites/{siteId}/content-types` | コンテンツ種類定義 |
| 管理 | `GET /api/admin/sites/{siteId}/content/{contentType}` | 一覧 |
| 管理 | `POST /api/admin/sites/{siteId}/content/{contentType}` | 作成 |
| 管理 | `GET /api/admin/sites/{siteId}/content/{contentType}/{id}` | 1件 |
| 管理 | `PATCH /api/admin/sites/{siteId}/content/{contentType}/{id}` | 更新 |
| 管理 | `DELETE /api/admin/sites/{siteId}/content/{contentType}/{id}` | 削除 |
| 管理 | `POST .../content/{contentType}/{id}/publish` | 公開 |
| 管理 | `POST .../content/{contentType}/{id}/unpublish` | 非公開 |
| 管理 | `POST .../content/{contentType}/{id}/duplicate` | 複製 |
| 管理 | `GET /api/admin/sites/{siteId}/assets` | メディア一覧 |
| 管理 | `POST /api/admin/sites/{siteId}/assets` | アップロード |
| 管理 | `PATCH /api/admin/sites/{siteId}/assets/{assetId}` | メタ更新 |
| 管理 | `PATCH /api/admin/sites/{siteId}/content/{contentType}/{id}/sections/{sectionId}` | セクション部分更新（Phase 4） |
| 管理 | `POST /api/admin/auth/login` | Auth.js 有効時: Credentials → アプリセッショントークン |
| 管理 | `POST /api/admin/auth/logout` | アプリセッション無効化 |
| Auth.js | `/api/auth/[...nextauth]` | NextAuth v5 ハンドラ（`lib/auth/authjs.ts`） |

**本番認証（Phase B）**: `CMS_AUTH_PROVIDER=authjs` 時は `POST /api/admin/auth/login` → DB `Session` → cookie `cms_session` / `x-session-token`。`lib/auth/session-bridge.ts` 経由で `AuthContext.userId` を付与。`CMS_ENFORCE_ADMIN_LOGIN=true` で管理 UI を middleware がガード。

### エンドポイント例（クエリ・認証）

| 種別 | 例 |
|------|-----|
| 配信一覧 | `GET /api/sites/{siteId}/content/{contentType}?slug=about&limit=10&offset=0` |
| プレビュー | 配信 GET + `?draft=true&previewToken=xxxx` |
| 認証ヘッダー | 公開: `x-api-key` / 管理: `x-admin-api-key` または `x-session-token` / cookie `cms_session` |

### レスポンス・型

| 項目 | 規約 |
|------|------|
| 一覧 | ページネーション（limit / offset） |
| キャッシュ | 配信レスポンスは `no-store`（毎リクエストで APIキー認証を担保）。負荷対策は Next.js Data Cache（`unstable_cache` + タグ）で DB 読み取りを保護し、公開/更新/削除/公開取消/作成時に `revalidateTag(tag, { expire: 0 })` で即時失効 → フロントへ CDN の TTL 待ちなしでほぼ即時反映 |
| エラー | `{ error: string, code: string }` |
| 型定義 | `lib/schemas/` または `lib/types/` に集約 |
| Prisma | APIレスポンス型と混同しない。必要なら変換レイヤー |

### 配信キャッシュ戦略（オンデマンド失効）

CDN の TTL（`s-maxage`）依存をやめ、**Data Cache + タグ失効**でほぼ即時反映と負荷抑制を両立する。

| レイヤー | 役割 |
|----------|------|
| HTTP `Cache-Control` | 公開配信は `no-store`。CDN ヒットによる APIキー認証バイパスを防ぎ、毎回認証を通す |
| Next.js Data Cache | `lib/content/delivery.ts` が公開読み取りを `unstable_cache`（item/list タグ・安全網 TTL 1h）でラップし DB を保護。ドラフト/プレビューは非キャッシュ |
| 失効 | `lib/content/store.ts` の各ミューテーション → `lib/content/delivery-tags.ts` の `revalidateDeliveryContent` が `revalidateTag(tag, { expire: 0 })` を発行。Vercel 上では Data Cache と CDN を約 300ms で失効 |

タグは正準サイト ID で正規化（スラッグ/ID どちらでも一致）。これにより公開保存後の次リクエストで最新が返り、CDN の TTL 待ち（旧仕様で最大 5 分）が解消される。

---

## MVP スコープ

### 含める

| カテゴリ | 機能 |
|---------|------|
| 基盤 | ログイン、サイト作成、コンテンツ種類（JSON取り込み） |
| コンテンツ | CRUD、下書き・公開・非公開、セクション型 |
| API | REST配信、プレビュー、APIキー認証 |
| メディア | 画像アップロード |
| デモ | `examples/preview/`（HTML or Astro） |

### 後回し

多言語 / 承認フロー / Webhook / MCP / AIチャットUI / サイト複製 / 課金 / microCMS完全代替 / GUIでのコンテンツ種類新規作成

### 設計上の禁止

| 禁止 | 理由 |
|------|------|
| CMS側でHTML配信 | ヘッドレス原則 |
| セクション型にCSS・レイアウト | 表示はフロントエンド責務 |
| GUIなし運用 | 編集者向けGUIは製品前提 |
| 公開APIから下書き返却 | プレビュートークン経由のみ |

要件の詳細・Phase 優先順位は [SPEC.md](../../SPEC.md) を参照。
