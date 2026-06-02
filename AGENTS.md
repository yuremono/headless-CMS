# ヘッドレス型 簡易CMS

ヘッドレス CMS 基盤。CMS は管理画面・管理 API・配信 API に専念し、表示フロントエンドは`0529headless-front`で構築する。

## 技術スタック

| 項目 | 内容 |
| --- | --- |
| フレームワーク | Next.js App Router |
| 言語 | TypeScript |
| DB / ORM | Supabase PostgreSQL + Prisma |
| 認証 | Auth.js + アプリセッション |
| ストレージ | Cloudflare R2 / S3 互換 |
| スタイル | Sass + Tailwind CSS |
| テスト | Vitest |

## 作業対象

現在の管理画面は次の2ページのみ。

| 用途 | ファイル | URL |
|------|----------|-----|
| 管理画面 | `app/page.tsx` | `/` |
| ログイン | `app/login/page.tsx` | `/login` |

## DB 運用

ローカルと本番は同一 Supabase DB（`portfolio-cms` / schema `headless_cms`）を共有する。ローカル編集は本番データに反映される。

禁止:
- `npx prisma migrate reset`
- `npx tsx prisma/seed.ts`
- `npm run prisma:seed`
- その他 seed 相当の再投入

スキーマ変更時のみ [docs/vercel-deploy.md](./docs/vercel-deploy.md) に従い、Direct 接続で `npx prisma migrate deploy` を実行する。
- CLI / MCP は Admin API 経由で操作し、DB 直書きしない。

## 主要ディレクトリ

| パス | 内容 |
| --- | --- |
| `app/` | 画面と Route Handler |
| `app/api/` | 管理 API・配信 API・Auth API |
| `components/admin/` | 管理画面コンポーネント |
| `lib/content/` | コンテンツ保存・配信ロジック |
| `lib/auth/` | 認証・権限 |
| `lib/storage/` | 画像アップロード |
| `packages/headless-cms-agent/` | CLI / MCP 共通ライブラリ |
| `packages/headless-cms-mcp/` | MCP サーバー |
| `prisma/` | Prisma schema / migrations |
| `scss/` | Tailwind + CustomClass |

## 参照ドキュメント

| 目的 | ファイル |
|------|----------|
| API・DB・セキュリティ | [docs/agents/architecture.md](./docs/agents/architecture.md) |
| 管理画面 UI / CSS | [docs/agents/coding.md](./docs/agents/coding.md) |
| CMS CLI | [docs/agents/cms-cli.md](./docs/agents/cms-cli.md) |
| CMS MCP | [docs/agents/cms-mcp.md](./docs/agents/cms-mcp.md) |
| 本番デプロイ | [docs/vercel-deploy.md](./docs/vercel-deploy.md) |

## 主要コマンド

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | プロダクションビルド |
| `npm run start` | ビルド結果の起動 |
| `npm test` | 単体テスト |
| `npm run test:coverage` | カバレッジ測定 |
| `npm run deploy` | CMS 本番デプロイ |
| `npm run deploy:front` | 案件フロント本番デプロイ |
| `npm run deploy:all` | CMS + 案件フロント本番デプロイ |
| `npm run cms -- ...` | CMS CLI |
| `npm run cms:mcp` | CMS MCP サーバー |

## サブエージェント・マルチタスク

### モデル選択

- **原則:** サブエージェントには **親エージェントと同じモデル** を使う。`model` 引数は **指定しない**（省略時は親と同一になる）。
- **例外:** ユーザーがモデル名を **明示した場合のみ**、その指定どおりに `model` を渡してよい。
- **禁止:** 速度・コスト・タスク内容などを理由に、親エージェントが **独自の判断でモデルを選ぶこと**。

作業内容に応じて`{参照ドキュメント}を必ず読むこと`をプロンプトに含める。親が必要なコンテキストを渡す責任を持つ。

## 基本方針

- 調査・編集・削除は最小差分で行う。
- ユーザー指示なしにブラウザ確認・ビルド・テストは実行しない。
- `.gitignore` 対象を強制 push しない
- ユーザー指示なしに本ファイル を編集しない
- 見た目確認時は `agent-browser` スキルまたは`computer-use`。保存先: `tmp/browser-checks/`  

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


