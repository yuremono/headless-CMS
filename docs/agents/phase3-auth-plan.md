# Phase 3: 本番認証 — 実装計画

## 概要

案件ごとに独立デプロイするヘッドレス CMS 向けに、管理画面・管理 API のセッション認証をデモ（固定トークン）から本番方式へ移行する。MVP では **Auth.js（NextAuth v5）を第一推奨** とし、Supabase 一式で運用する案件向けに **Supabase Auth を代替案** として残す。大規模実装は行わず、既存の `cms_session` / `x-session-token` と `AuthContext.userId` を維持したまま差し替え可能な骨格を置く。

## 要件（SPEC / architecture との整合）

| 出典 | 要件 |
|------|------|
| SPEC §6.9 / Phase 3 | 4 ロール（owner / admin / editor / viewer）、API キーとユーザー権限の分離 |
| SPEC §10.1–10.2 | 認証候補: Supabase Auth / Auth.js。MVP 個人推奨スタックは Supabase Auth |
| `architecture.md` | 管理 API: `x-admin-api-key` または `x-session-token` / cookie `cms_session` |
| 運用形態 | 1 案件 ≒ 1 CMS。マルチテナント SaaS 不要 |
| 制約 | デモログイン（`session-dev-token`）は開発で維持。秘密情報は `.env` のみ |

## 推奨: Auth.js（第一選択）

### 決定理由

| 観点 | Auth.js | Supabase Auth |
|------|---------|---------------|
| 既存 DB | ローカル / 任意 Postgres + Prisma `User` をそのまま利用しやすい | Supabase Postgres またはユーザー同期が必要 |
| `User` スキーマ | `emailVerified` 等、Auth.js Prisma Adapter と整合 | 別 `auth.users` → アプリ `users` のマッピングが必要 |
| デプロイ | Next.js 単体（Vercel / VPS）に収まる | Auth + DB + Storage を Supabase に寄せる案件向け |
| 管理 API | セッション JWT / DB セッションを `cms_session` に載せ替え可能 | Supabase JWT を検証して `userId` 解決 |
| 依存 | `@auth/core` + adapter（追加パッケージ） | `@supabase/ssr` 等 |

**結論**: デフォルト実装パスは **Auth.js + Prisma Adapter + Credentials（またはメール）**。顧客インフラがすでに Supabase フルスタックのときのみ **Supabase Auth** を選択する（`CMS_AUTH_PROVIDER=supabase`）。

### Auth.js 統合の要点（将来ステップ）

1. `AUTH_SECRET`（既に `.env.example`）をセッション署名に使用
2. `app/api/auth/[...nextauth]/route.ts` で Auth.js ハンドラ
3. Prisma Adapter で `User` / 将来 `Account` `Session` テーブル（必要なら migration）
4. ログイン成功時に **アプリ用セッショントークン** を発行し、既存 `persistAdminSession` と同じ cookie 名 `cms_session` を使用（管理 API 変更不要）
5. `validateSession` → `session-bridge` → `AuthContext.userId` → `resolveActorSiteRole`（`docs/agents/phase3-roles.md`）

## 代替: Supabase Auth

- **採用条件**: DB・Storage・Auth を Supabase に統一する納品案件
- **統合**: `@supabase/ssr` で cookie セッション → `users` テーブルへ `upsert`（email 一致）→ `site_members` 参照
- **注意**: ローカル Postgres のみの開発環境では Auth.js の方が手順が少ない

## アーキテクチャの変更（骨格済み / 予定）

| パス | 状態 | 内容 |
|------|------|------|
| `lib/auth/production-config.ts` | 骨格 | `CMS_AUTH_PROVIDER`, `CMS_ENFORCE_ADMIN_LOGIN` |
| `lib/auth/session-bridge.ts` | 実装済 | 本番セッション → `{ userId, sessionToken }`（Auth.js: DB `Session`） |
| `lib/auth/app-session.ts` | 実装済 | アプリセッション作成・検証・失効 |
| `lib/auth/authjs.ts` | 実装済 | Auth.js + Credentials + Prisma Adapter |
| `app/api/admin/auth/login` | 実装済 | ログイン → `cms_session` 用トークン発行 |
| `lib/auth/admin-route-guard.ts` | 骨格 | 管理 UI パス判定・リダイレクト URL |
| `lib/auth/index.ts` | 拡張 | 本番解決成功時に `userId` を `AuthContext` に付与 |
| `middleware.mjs` | 拡張 | `CMS_ENFORCE_ADMIN_LOGIN=true` 時のみ未ログイン UI を `/login` へ |
| `components/admin/LoginForm.tsx` | 拡張 | `authProvider` 表示（デモログイン動作は不変） |
| `.env.example` | 追記 | `CMS_AUTH_PROVIDER`, `CMS_ENFORCE_ADMIN_LOGIN` |

**意図的に未着手**: Supabase Auth 実装、OAuth プロバイダ、メール送信、パスワードリセット UI。

## 実装ステップ

### フェーズ A: 骨格（今回）

1. **設定モジュール** — `getAuthProvider()`, `isAdminLoginEnforced()`
2. **session-bridge スタブ** — provider 有効時のみ呼び出し、未実装は `null` で既存フォールバック
3. **validateSession** — 解決成功時 `actorId: user:{id}`, `userId` 設定
4. **middleware** — フラグ ON 時の管理 UI ガード（API CORS は従来どおり）
5. **LoginForm** — 本番プロバイダ名の表示のみ
6. **テスト** — 設定・ガード・デモセッション非回帰

### フェーズ B: Auth.js 最小（次 PR）

1. `npm i next-auth@beta`（v5）+ `@auth/prisma-adapter`
2. Credentials または Email プロバイダ 1 種
3. ログイン API で `cms_session` 発行（ランダムトークンを DB `Session` または署名 JWT に）
4. `session-bridge.resolveProductionSession` 実装
5. seed ユーザーと `site_members` 連携確認

### フェーズ C: 権限・運用（Phase 3 残り）

1. `PHASE3_ENFORCE_ROLES=true` 手順（`phase3-roles.md`）
2. メンバー CRUD UI
3. API キーローテーション UI と操作ログ（SPEC Phase 3）

## トレードオフ

### Auth.js を第一推奨にする

- **Pros**: Prisma `User` 直結、ローカル Postgres 開発と一致、Next.js 公式パターンに近い
- **Cons**: SPEC §10.2 の「Supabase Auth」単体推奨とは文言差がある
- **Alternatives**: Supabase Auth 第一（Supabase 案件特化）
- **Decision**: 汎用 Postgres 案件が多いため Auth.js をデフォルトにし、環境変数で Supabase に切替

### デモログイン維持

- **Pros**: 既存 236+ テスト・手順書・デモ納品が無変更
- **Cons**: `NODE_ENV=production` でも `CMS_SESSION_TOKEN` 未設定時はデモトークン不可（既存仕様）
- **Decision**: `session-dev-token` は `NODE_ENV !== production` のみ。本番は provider 必須

### middleware ガードは opt-in

- **Pros**: デフォルト OFF で既存 E2E・手動確認を壊さない
- **Cons**: 本番でフラグ忘れのリスク
- **Decision**: 納品チェックリストに `CMS_ENFORCE_ADMIN_LOGIN=true` を追加（`delivery-guide.md` 更新は別タスク）

## テスト戦略

| 種別 | 対象 |
|------|------|
| ユニット | `production-config`, `admin-route-guard`, `session-bridge`, 既存 `lib/auth/index.test.ts` |
| 結合 | ログイン → cookie → 管理 API（Auth.js 導入後） |
| E2E | 未着手（Phase 3 polish） |

## リスクと対策

| リスク | 対策 |
|--------|------|
| 二重 middleware（.mjs / .ts） | **middleware.mjs のみ** 使用 |
| セッション形式の変更で Client 破壊 | cookie 名 `cms_session` とヘッダ `x-session-token` を維持 |
| Supabase / Auth.js 両方のメンテ | `CMS_AUTH_PROVIDER` で単一コードパスに集約（bridge） |

## 成功基準

- [x] `phase3-auth-plan.md` に Auth.js 推奨と Supabase 代替が記載されている
- [x] デモログイン・`session-dev-token`・既存管理 API が動作する
- [x] `AuthContext.userId` を本番 bridge から設定できる骨格がある
- [x] Auth.js 実ログイン（フェーズ B: Credentials + DB Session + `cms_session`）
- [ ] Supabase Auth の実ログイン
- [ ] `PHASE3_ENFORCE_ROLES` 本番有効化

## 関連ドキュメント

- [phase3-roles.md](./phase3-roles.md) — ロール解決・権限強制
- [architecture.md](./architecture.md) — API 認証ヘッダー
- [handoff-2026-05-29.md](./handoff-2026-05-29.md) — ローカル手順
