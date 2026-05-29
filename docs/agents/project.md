# プロジェクト構成

## 技術スタック

MVP 推奨構成（`SPEC.md` §10.2 準拠）:

| 領域 | 技術 |
|------|------|
| フレームワーク | Next.js（App Router） |
| 言語 | TypeScript |
| DB / ORM | PostgreSQL + Prisma |
| 認証 | Supabase Auth / Auth.js |
| 画像ストレージ | Cloudflare R2（S3互換） |
| スタイリング | Sass + Tailwind CSS **v3**（v4 禁止） |
| デプロイ | Vercel |

Next.js は **`src/` ディレクトリを使わない** ルート構成（CSS を先に配置済み）。

## コマンド

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー（管理画面 + API） |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npx prisma migrate dev` | DBマイグレーション（開発） |
| `npx prisma migrate deploy` | DBマイグレーション（本番相当・初回 setup） |
| `npx prisma generate` | Prisma Client 再生成 |
| `npx prisma studio` | DB GUI 確認 |
| `npx tsx prisma/seed.ts` | デモデータ投入（`npm run prisma:seed` の代替推奨） |
| `npm test` | Vitest 単体テスト |
| `npm run test:coverage` | カバレッジ付きテスト |

## ディレクトリ構成

| パス | 役割 |
|-----|------|
| `SPEC.md` | 要件定義書 |
| `app/` | Next.js App Router（ページ・レイアウト・API Route） |
| `app/(admin)/` | 管理画面（ログイン後 UI） |
| `app/api/admin/` | 管理API |
| `app/api/sites/` | 配信API |
| `components/admin/` | 管理画面コンポーネント |
| `lib/db/` | Prisma クライアント・DB操作 |
| `lib/auth/` | 認証・セッション・APIキー検証 |
| `lib/admin/` | 管理画面 RSC 用 DB ローダー（`loader.ts`） |
| `lib/content/` | コンテンツ store / service / delivery / mappers / types。配信キャッシュ失効は `delivery-tags.ts`（`revalidateTag`）+ `delivery.ts`（`unstable_cache`） |
| `lib/schemas/` | コンテンツモデル・フィールド型・バリデーション |
| `lib/sanitize/` | richText HTML サニタイズ（`data_json` 向け） |
| `lib/preview/` | プレビュー URL・トークン解決 |
| `lib/sections/` | **未作成（将来）** — セクション型は `content-types/*.json` + SectionEditor |
| `lib/storage/` | 画像・ファイルアップロード（`local` / `r2` stub） |
| `middleware.mjs` | `/api/*` 向け CORS（`FRONTEND_BASE_URL`） |
| `content-types/` | コンテンツ種類スキーマ JSON（MVPはここで定義） |
| `examples/preview/` | プレビュー検証用フロント（HTML or Astro） |
| `prisma/schema.prisma` | DBスキーマ |
| `index.scss` | Tailwind + CustomClass エントリ |
| `scss/globals.scss` | Sass グローバルエントリ |
| `scss/_01variables.scss` | 色・サイズ変数（oklch） |
| `scss/_components.scss` | コンポーネント同名カスタムクラス（`@apply` 集約） |
| `.env.example` | 環境変数例（実キー禁止） |
| `docs/` | API仕様・運用メモ |
| `tasks/` | 作業ログ・学習ログ |

## 実装状態

| 項目 | 状態 |
|------|------|
| 要件定義 | `SPEC.md` v0.2 |
| CSS基盤 | `index.scss` / `scss/` 配置済み |
| **Phase 1** | 完了 — Prisma（7テーブル）、`content-types/` 3種、seed、配信/管理 API、APIキー、簡易ログイン |
| **Phase 2 MVP** | 完了 — SectionEditor、SEO UI、画像アップロード、メディア、プレビューリンク、`examples/preview/`、duplicate/unpublish、richText サニタイズ |
| Next.js | App Router（管理画面 + API Route）、`npm run build` 成功 |
| テスト | Vitest **391 件**（65 ファイル）。カバレッジ対象は `lib/**` + `app/api/**`（目標 80% 維持）。UI / E2E は対象外 |
| 未着手（Phase 3+） | 4ロール権限、本番認証（Supabase/Auth.js）、R2 本番運用、MCP/AI UI |
| プロトタイプ目標 | 1サイト / 1ユーザー / 3モデル（topPage, page, news）/ セクション編集 / 公開API / プレビューAPI — **成立済み** |

詳細な乖離メモ・ローカル手順は `docs/agents/handoff-2026-05-29.md` を参照。
