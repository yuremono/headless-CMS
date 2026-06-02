# ヘッドレス型 簡易CMS

制作会社向け CMS 基盤。コンテンツの作成・編集・API配信に専念し、表示フロントエンドとは分離する。

---

## メイン作業ページ

[重要] 現在の表示するページは`app/(admin)/page.tsx` `app/(admin)/login/page.tsx`のみ。ユーザーの指示がなければ他のページで使っているコンポーネントは編集しない。

| 環境 | URL |
|------|-----|
| **ローカル** | http://localhost:3000/ |
| **本番（動作確認済み）** | https://headless-cms0529.vercel.app/ |

`npm run dev` 起動後にローカル URL を開く。本番は `npm run deploy` で反映。
ユーザー管理のターミナルで`npm run dev` を実行している前提で行動する。停止した場合はユーザーに再起動を促す。 

> **【重要】DB 共有運用（ローカル = 本番）**
> ローカルと本番は **同一の Supabase データベース**（`portfolio-cms` / schema `headless_cms`）を共有しています。`.env.local` の `DATABASE_URL` が本番と同じ Supabase（セッションプーラー 5432）を指すため、`localhost:3000` での編集は **即座に本番データへ反映**されます。
> - `npx prisma migrate reset` / `npx tsx prisma/seed.ts` の再実行は **本番データを破壊**するため実行しない。
> - スキーマ変更時のみ `docs/vercel-deploy.md` の手順に従い Direct(5432) で `migrate` する。
> - 独立したローカル DB に戻す場合は `.env.local` の `DATABASE_URL` 行を削除して dev を再起動する（`.env` の `localhost` 設定に戻る）。

### Vercel（本番）

| 役割 | プロジェクト名 | Production URL（現状） |
|------|----------------|------------------------|
| CMS | `headless-cms` | https://headless-cms0529.vercel.app |
| 案件フロント | `headless-front` | https://headless-front0529.vercel.app |

ログイン（本番）: https://headless-cms0529.vercel.app/login

---

## セットアップ（ローカル）

```bash
npm install
cp .env.example .env.local
# .env.local の DATABASE_URL 等を編集

npx prisma migrate deploy   # 開発初回は npx prisma migrate dev でも可
npx tsx prisma/seed.ts      # または npm run prisma:seed
```

デモログインは `.env.example` の `ADMIN_DEMO_EMAIL` / `ADMIN_DEMO_PASSWORD` を参照。

## コマンド

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー（管理画面 + API） |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npm test` | Vitest 単体テスト |
| `npm run test:coverage` | カバレッジ付き（`lib/**` + `app/api/**`） |
| `npm run deploy` | 本番デプロイ（CMS / Vercel production） |
| `npm run deploy:all` | 本番デプロイ（CMS + 案件フロント） |
| `npm run cms -- …` | CMS CLI（Admin API 経由。詳細 `docs/agents/cms-cli.md`） |
| `npm run cms:mcp` | CMS MCP サーバー起動（Cursor 連携。詳細 `docs/agents/cms-agent.md`） |

DB: `npx prisma migrate dev` / `npx prisma studio` / `npx tsx prisma/seed.ts`

## 本番デプロイ（Vercel）

**前提:** [Vercel CLI](https://vercel.com/docs/cli) で `vercel login` 済み。CMS / フロントは Vercel にリンク済み。

```bash
npm run deploy
```

フロントも同時: `npm run deploy:all`（内部は `npx vercel --prod --yes`）migrate / seed は含まない。

| コマンド | 対象 |
|---------|------|
| `npm run deploy` | CMS のみ |
| `npm run deploy:front` | 案件フロントのみ |
| `npm run deploy:all` | CMS + フロント |

コンテンツ **公開** は管理画面から。CSR 公開サイトの再デプロイは不要。

**DB スキーマ変更時のみ:**

```bash
npx prisma migrate deploy
npm run deploy
```

### 初回セットアップ

1. `cp .env.supabase.local.example .env.supabase.local` に DB パスワード  
2. `./scripts/setup-supabase-deploy.sh`（1 回）

要約: [USER_SETUP.md](./USER_SETUP.md)。トラブル時: [docs/vercel-deploy.md](./docs/vercel-deploy.md)。

## Preview デモ

[examples/preview/](examples/preview/README.md) — CMS `:3000` + 別ポートで静的デモ（例: `:3001`）。`FRONTEND_BASE_URL=http://localhost:3001` でプレビューリンク連携。

---

## 設計の核心

| 原則 | 内容 |
|------|------|
| ヘッドレス | CMSはHTMLを出力しない。JSONを返す |
| セクション | 表示責任を持たない。構造化データのみ |
| スキーマ駆動 | 管理画面・配信API・AI操作APIを同一スキーマで統一 |
| 即時配信 | 配信は `no-store` + Data Cache。公開操作で `revalidateTag` 失効し、フロントへほぼ即時反映（詳細 `docs/agents/architecture.md`） |

## ドキュメント参照ガイド

作業内容に応じて必要なファイルだけ読む。

| いつ | 読むファイル |
|------|-------------|
| 開発当初の要件 | `SPEC.md`(更新不要) |
| composable フィールド UI・複製・繰り返し配列 | `docs/FIELD.md` |
| 技術スタック・ディレクトリ・コマンド・実装状態 | `docs/agents/project.md` |
| API設計・DB・セキュリティ・MVP範囲 | `docs/agents/architecture.md` |
| CMS CLI / MCP（エージェント操作） | `docs/agents/cms-mcp.md`（MCP 使い方）→ `docs/agents/cms-agent.md` → `docs/agents/cms-cli.md` |
| 案件フロントから MCP | フロント repo の `cms-mcp/README.md`（CMS clone 不要） |
| DOM・Tailwind・style変更 | `docs/agents/coding.md` |

## サブエージェント・マルチタスク

### モデル選択

- **原則:** サブエージェントには **親エージェントと同じモデル** を使う。`model` 引数は **指定しない**（省略時は親と同一になる）。
- **例外:** ユーザーがモデル名を **明示した場合のみ**、その指定どおりに `model` を渡してよい。
- **禁止:** 速度・コスト・タスク内容などを理由に、親エージェントが **独自の判断でモデルを選ぶこと**。

| 状況 | 親エージェントが伝えること |
|------|---------------------------|
| 共通 | `AGENTS.md` を読み、上記「ドキュメント参照ガイド」に従ってタスクに必要なファイルを読んでから着手する |
| API・DB・認証 | `docs/agents/architecture.md`（必要なら `SPEC.md`） |
| 管理画面UI・CSS | `docs/agents/coding.md` |
| 環境・パス・コマンド | `docs/agents/project.md` |
| 要件・スコープ判断 | `SPEC.md` |

プロンプトに読むべきファイルパスを明示する。親が必要なコンテキストを渡す責任を持つ。

## エージェントの責務

| 責務 | 内容 |
|------|------|
| 実装 | ヘッドレス原則を守り、CMS基盤（管理API・配信API・管理画面）を構築する |
| 分離 | フロントエンド案件用の表示ロジック・CSSを配信データに混入させない |
| 参照 | 設計判断は `SPEC.md`、実装詳細は `docs/agents/` を都度参照する |
| 委譲 | サブエージェント起動時は関連ドキュメントの読了を指示する（上記「サブエージェント・マルチタスク」） |
| 変更 | 外科的に最小差分。初編集ファイルは事前確認 |
| 秘密 | APIキー等をリポジトリに書かない |

## Execution rules

- `.gitignore` 対象を強制 push しない
- ユーザー指示なしに本ファイル を編集しない
- ブラウザ確認・ビルド・テストは指示なしでは実行しない

## ブラウザ確認

管理画面の見た目確認時は `agent-browser` スキル。保存先: `tmp/browser-checks/`  

## 禁止事項

<important if="creating or editing files">
- 調査・検討段階で作業を始めない（ユーザーの口調で判断）
- いかなる識別子にもプロジェクト名を使用しない
- 秘密情報やファイルパスのユーザー名を公開されるファイルに書かない
- CMS側にフロントエンド案件用の表示ロジックを混入させない
</important>

<important if="overwriting, deleting, or resetting">
- 調査・検討段階で作業を始めない（ユーザーの口調で判断）
- 承認なしにコメントを削除しない
</important>

## 誤変換に注意

ユーザー発言に不自然な単語があれば文脈から適切に変換して回答する。
