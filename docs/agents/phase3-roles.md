# Phase 3: 4ロール権限（設計メモ）

## ロール定義（SPEC 6.9）

| ロール | 権限概要 |
|--------|----------|
| `owner` | サイト削除、APIキー管理、全操作 |
| `admin` | コンテンツ種類・メンバー管理、公開操作 |
| `editor` | コンテンツ作成・編集・公開 |
| `viewer` | 閲覧のみ |

Prisma: `SiteMemberRole` enum + `site_members.role`（init migration 済み）。

## コード配置

| ファイル | 責務 |
|----------|------|
| `lib/auth/roles.ts` | ロール定数、`AdminPermission`、`hasPermission` |
| `lib/auth/site-role.ts` | `resolveActorSiteRole` — 認証コンテキストからサイト内ロール |
| `lib/auth/admin-access.ts` | `checkSitePermission` / `applySitePermission` |
| `lib/content/service.ts` | `resolveAdminRequest` — 認証 → ロール → 権限（任意） |

## ロール解決（骨格）

1. **管理 API キー** (`mode: admin`) → `owner` 相当（キー単位ロールは未実装）
2. **デモセッション** (`session-dev-token`, 非 production) → `owner`（既存ログイン維持）
3. **本番セッション** → `site_members` を `ADMIN_DEMO_EMAIL` ユーザーで参照（暫定。Auth.js / Supabase 導入後は `AuthContext.userId`）
4. **未登録メンバー** → `editor` フォールバック

## 権限強制

- 既定: **強制しない**（全 API は従来どおり通過）
- `PHASE3_ENFORCE_ROLES=true` のときのみ `resolveAdminRequest(..., { permission })` で 403
- 全管理 API route に `permission` マッピング済み（`site:write` は owner/admin のみ）

## デモログイン

`LoginForm` → `session-dev-token` → `resolveActorSiteRole` が `owner` を返すため、Phase 3 骨格追加後も管理 API 動作は変わらない。

## 未実装（残タスク）

- [ ] 本番認証と `AuthContext.userId` の連携
- [x] 管理 API ルートごとの `AdminPermission` マッピング
- [ ] メンバー CRUD UI / API
- [ ] `viewer` 向け管理画面の読取専用 UI
- [ ] API キーとロールの分離（公開キー読取 / 管理キー書込は既存、ユーザー権限とは別軸）
- [ ] `PHASE3_ENFORCE_ROLES` 本番有効化手順・E2E

## テスト

- `lib/auth/roles.test.ts` — 権限マトリクス
- `lib/auth/site-role.test.ts` — ロール解決
- `lib/auth/admin-access.test.ts` — 強制 ON/OFF
