# 進捗チェックリスト

**最終更新:** 2026-05-29 21:35 JST  
**参照:** [SPEC.md](../SPEC.md) v0.2（§12 Phase 定義・§16 プロトタイプ）  
**検証:** `npm test` / `npm run test:coverage` / `npm run build` を本日実行して反映

---

## 1. サマリー

| スコープ | 進捗 | 状態メモ |
|---------|------|----------|
| **Phase 1**（CMSコア） | **完了** | DB・認証・CRUD・配信/管理 API・API キー・JSON スキーマ取り込み |
| **Phase 2**（編集体験） | **ほぼ完了** | セクション UI・SEO・画像・プレビュー・並び替え。一部フィールド型・キャッシュは未 |
| **Phase 3**（納品運用） | **骨格のみ** | 4 ロール定義・権限チェック関数はあるが API/UI 未適用 |
| **Phase 4**（AI 編集） | **未着手** | — |
| **§16 プロトタイプ** | **成立** | 3 種類・編集→プレビュー→公開 API のデモライン到達 |
| **テスト** | **249 件 / 37 ファイル** | スコープ内カバレッジ **91.8%**（Lines、`lib/**` + `app/api/**`、目標 80% 達成） |
| **ビルド** | **成功** | `npm run build`（Next.js 16.2.6） |

---

## 2. Phase 1 チェックリスト

> SPEC §12「Phase 1：CMSコア」＋ §11 MVP 必須のうち Phase 1 相当

### 2.1 データ基盤

- [x] Prisma スキーマ（7 モデル: User, Site, SiteMember, ApiKey, ContentModel, Content, Asset）
- [x] 初回マイグレーション（`prisma/migrations/20260529120000_init`）
- [x] seed スクリプト（デモサイト・3 コンテンツ種類・API キーハッシュ）
- [x] サイト単位のデータ分離（`site_id` スコープ）

### 2.2 認証・サイト

- [x] 管理画面ログイン（デモ用セッション / 環境変数切替）
- [x] ログアウト（`LogoutButton` + セッションクリア）
- [x] サイト作成 API（`POST /api/admin/sites`）
- [x] サイト作成 GUI（ダッシュボード `SiteCreateForm`）
- [ ] 本番認証（Supabase Auth / Auth.js）— 未導入（デモログインのみ）

### 2.3 コンテンツ種類（スキーマ）

- [x] `content-types/*.json` 3 種（topPage / page / news）
- [x] デプロイ/seed 時の DB 取り込み（`lib/schemas`）
- [x] 管理画面でのスキーマ読み取り表示（`/sites/{siteId}/content-types`）
- [ ] GUI からの種類追加・変更 — Phase 2 以降（現状 JSON + 再デプロイ）

### 2.4 コンテンツ CRUD・公開制御

- [x] コンテンツ一覧・作成・編集・削除（管理 API + 管理画面）
- [x] 下書き保存（`status: draft`）
- [x] 公開 / 非公開（`publish` / `unpublish` エンドポイント）
- [x] コンテンツ複製（`duplicate`）
- [x] スラッグ設定
- [x] 更新日時（API レスポンス・一覧表示）
- [ ] 作成者 / 更新者の編集画面表示 — API・DB は保持、編集 UI では一覧の author のみ（部分）

### 2.5 API キー・配信 API

- [x] 公開 API キー / 管理 API キー発行（サイト作成・seed 時）
- [x] 公開 API キー認証（`x-api-key` / `x-public-api-key`）
- [x] 管理 API キー認証（`x-admin-api-key`）
- [x] 公開 API: JSON 返却・公開済みのみ（下書き除外）
- [x] 配信 GET 一覧 / 単体 / slug 指定
- [x] ページネーション（`limit` / `offset`）
- [ ] 公開 API キャッシュヘッダ（`Cache-Control` 等）— 未実装

### 2.6 管理 API

- [x] コンテンツ CRUD（POST / PATCH / DELETE）
- [x] publish / unpublish / duplicate
- [x] スキーマ取得（`/schemas`）
- [x] ダッシュボード集計 API
- [x] グローバル管理 API（`GET|POST /api/admin/sites`）

### 2.7 セキュリティ・基盤

- [x] CORS（`middleware.mjs` → `/api/*`）
- [x] 入力バリデーション（Zod / スキーマ検証）
- [x] API キー SHA-256 ハッシュ保存
- [x] SQL インジェクション対策（Prisma パラメータ化）
- [x] XSS 対策（richText サニタイズ — Phase 2 で拡充済みだが Phase 1 以降の基盤として記載）

---

## 3. Phase 2 チェックリスト

> SPEC §12「Phase 2：制作会社向け編集体験」

### 3.1 セクション型 UI

- [x] `sectionArray` フィールドと SectionEditor
- [x] セクション追加・削除・複製
- [x] セクション非表示（`visible: false`）
- [x] セクション並び替え（↑↓ ボタン + ドラッグ&ドロップ）
- [x] 型ごとの入力 UI（SectionFieldForm / allowedSections.fields）
- [x] セクションデータの JSON 保存・API 配信
- [x] sectionArray 内 richText サニタイズ

### 3.2 画像・ファイル

- [x] 画像アップロード（管理 API + `ImageFieldInput` / `MediaLibrary`）
- [x] 画像一覧（メディアライブラリ `/sites/{siteId}/media`）
- [x] alt テキスト設定（アセット PATCH）
- [x] ファイルサイズ / MIME 制限（`lib/storage/validate`）
- [x] ローカルストレージ（`STORAGE_PROVIDER=local`）
- [ ] Cloudflare R2 本番運用 — stub のみ（`lib/storage/r2`）

### 3.3 SEO

- [x] SEO フィールド UI（`SeoFields`: title, description, og*, canonical, noindex）
- [x] `data_json` への SEO 保存・配信

### 3.4 プレビュー

- [x] 下書きプレビュー API（`?draft=true&previewToken=`）
- [x] プレビュートークン検証（静的 env / 開発フォールバック）
- [x] 管理画面プレビューリンク（`PreviewLink` + `buildPreviewUrl`）
- [x] 同梱プレビューフロント（`examples/preview/` 静的 HTML）
- [ ] 署名付き previewToken の本番運用 — 実装済み（`PREVIEW_TOKEN_SECRET`）だが未設定時は静的トークン（部分）

### 3.5 管理画面 UX

- [x] ダッシュボード（サイト一覧・公開/下書き数・最近更新）
- [x] コンテンツ一覧：ステータス絞り込み・キーワード検索
- [x] コンテンツ編集：下書き保存・公開・プレビュー
- [ ] トップレベル `object` / `array` / `reference` / `file` 汎用 FieldRenderer — セクション内・SEO は対応、汎用 object UI は未（部分）

---

## 4. Phase 3 / Phase 4（未着手・骨格のみ）

> SPEC §12 Phase 3–4。完了 `[x]`、未着手 `[ ]`、骨格のみは注記。

### 4.1 Phase 3：納品運用

- [ ] 4 ロールの API 強制（`PHASE3_ENFORCE_ROLES=true` + ルート別 permission）— 骨格のみ（`lib/auth/roles.ts` 等）
- [ ] メンバー CRUD UI / API
- [ ] viewer 向け読取専用管理画面
- [ ] API キーローテーション UI
- [ ] 操作ログ
- [ ] バックアップ / DB エクスポート手順・自動化
- [ ] コンテンツ / サイトエクスポート
- [ ] 納品用簡易ドキュメント（案件向け）
- [ ] 本番認証（Supabase Auth / Auth.js）と `AuthContext.userId` 連携

### 4.2 Phase 4：AI 編集対応

- [ ] スキーマ取得 API の AI 向け拡張（現状 `/schemas` は管理 API として存在）
- [ ] セクション単位 PATCH API（`.../sections/{sectionId}`）
- [ ] セクション追加 / 削除 API
- [ ] AI 編集用下書きフロー
- [ ] 差分確認 UI
- [ ] MCP 対応
- [ ] 自然言語編集 UI

---

## 5. §16 デモ成立ライン（プロトタイプ成功条件）

> SPEC §16「最初に作るべきプロトタイプ」

| # | 成功条件 | 状態 |
|---|----------|------|
| 1 | 1 サイト（1 デプロイ） | [x] seed + サイト作成 GUI |
| 2 | 1 ユーザー | [x] seed デモユーザー |
| 3 | 3 コンテンツ種類（topPage / page / news） | [x] `content-types/` + seed |
| 4 | 画像アップロード | [x] 管理 API + メディア UI |
| 5 | ページ編集（管理画面 GUI） | [x] ContentForm + スキーマ駆動フォーム |
| 6 | セクション編集 | [x] SectionEditor |
| 7 | 公開 API | [x] `GET /api/sites/{siteId}/content/...` |
| 8 | プレビュー API + 管理画面プレビューリンク | [x] draft + token + PreviewLink + `examples/preview/` |

### §16 デモフロー（編集 → プレビュー → 公開 → 配信）

- [x] CMS でトップページ hero / セクションを編集
- [x] 下書き保存
- [x] 管理画面プレビューリンク → `examples/preview` が token 付き API 取得・表示
- [x] 公開操作
- [x] 公開 API から取得（フロント案件反映の前提デモ）

### §14 成功条件（MVP 段階）— 参考

- [x] 管理画面からページデータを作成できる
- [x] セクションを追加・並び替えできる
- [x] 画像を登録できる
- [x] 下書きと公開を分けられる
- [x] API で公開データを取得できる
- [x] 同梱プレビューフロントでページ表示できる
- [ ] クライアントが最低限の更新を迷わずできる — UX polish 余地あり（主観・運用検証待ち）
- [x] 制作会社が案件ごとに再利用できる（1 案件 ≒ 1 デプロイ方針・サイト作成 GUI）

---

## 6. 技術的負債・ブロッカー

| 項目 | 状態 | 備考 |
|------|------|------|
| **Supabase DB 接続** | 未接続 | ローカル PostgreSQL で開発。接続・migrate は**ユーザー作業**（`.env.example` に Direct/Pooler 例） |
| **git リポジトリ** | 未初期化 | `.git` なし（2026-05-29 確認）。初回 commit はユーザー判断 |
| **本番認証** | 未導入 | デモセッション + 開発用 API キー |
| **R2 ストレージ** | stub | `STORAGE_PROVIDER=local` が MVP 既定 |
| **Phase 3 権限強制** | オフ既定 | `PHASE3_ENFORCE_ROLES` 未設定時は全操作許可 |
| **管理画面 UI テスト** | 対象外 | カバレッジは `lib/**` + `app/api/**` のみ。E2E なし |
| **Next.js middleware** | 暫定 | `middleware.mjs`（将来 proxy 移行検討） |
| **seed ID 変動** | 運用注意 | 再 seed 後は `examples/preview/js/config.js` の contentId 更新が必要 |
| **dev/build 同時起動** | 運用注意 | 複数 `next dev` / `next build` でロックエラー |

---

## 7. クイックリンク

### ドキュメント

| 用途 | パス |
|------|------|
| 引き継ぎ・ローカル手順 | [docs/agents/handoff-2026-05-29.md](agents/handoff-2026-05-29.md) |
| プロジェクト構成・コマンド | [docs/agents/project.md](agents/project.md) |
| API・DB・セキュリティ | [docs/agents/architecture.md](agents/architecture.md) |
| Phase 3 権限メモ | [docs/agents/phase3-roles.md](agents/phase3-roles.md) |
| 要件定義 | [SPEC.md](../SPEC.md) |
| エージェントルール | [AGENTS.md](../AGENTS.md) |

### ローカル URL（開発時）

| 用途 | URL |
|------|-----|
| CMS 管理画面 | http://localhost:3000/ |
| ログイン | http://localhost:3000/login |
| サイト概要（slug 例） | http://localhost:3000/sites/main-site |
| プレビューデモ | http://localhost:3001/ |
| 配信 API 例 | `GET http://localhost:3000/api/sites/main-site/content/topPage` |

### 主要コマンド

```bash
npm run dev              # CMS (:3000)
cd examples/preview && python3 -m http.server 3001
npx prisma migrate deploy && npx tsx prisma/seed.ts
npm test && npm run test:coverage && npm run build
```

---

## SPEC との対応方針

1. **Phase 列は SPEC §12 の 4 段階に厳密対応** — MVP 必須との対応表（§12 冒頭）も Phase 1–2 にマッピング。
2. **§16 は独立セクション** — プロトタイプデモの Go/No-Go ラインとして、Phase 2 完了とは別に成功条件テーブルで追跡。
3. **完了判定は実装確認ベース** — 本ファイル作成時に `npm test`（249 passed）、`npm run test:coverage`（91.8% Lines）、`npm run build`（成功）、`.git` 未初期化を実行確認。
4. **部分完了は `[ ]` + 注記** — 署名付き previewToken、汎用 object フィールド UI、権限骨格など。
5. **更新タイミング** — 再 seed・Phase 3 着手・Supabase 接続・git 初期化後にサマリー表と §6 を更新する。
