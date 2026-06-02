# CMS MCP 使い方（Cursor 連携）

AI エージェント（Cursor 等）から CMS コンテンツを編集するための **MCP（Model Context Protocol）** サーバーのセットアップと運用ガイド。

Admin Root と同じ **Admin API（PATCH + publish）** のみを使う。DB 直叩きはしない。

---

## 誰が何を用意するか

| 役割 | 用意するもの | 不要なもの |
|------|-------------|-----------|
| **CMS 管理者** | Vercel env の `CMS_ADMIN_API_KEY`、キーの安全な共有 | フロント開発者への CMS ソース権限 |
| **フロント開発者** | フロント repo、`CMS_ADMIN_API_KEY`（`.env` または Cursor MCP env） | CMS repo clone、Vercel CMS ログイン |

| キー | 用途 | フロント repo の env 名 |
|------|------|------------------------|
| 公開 API キー | 配信 API 読取（サイト表示） | `PUBLIC_API_KEY` |
| 管理 API キー | コンテンツ編集・公開 | `CMS_ADMIN_API_KEY` |

---

## リポジトリ別の起動方法

### 案件フロント repo（推奨 — CMS clone 不要）

別 PC・別場所のフロント開発者向け。**本リポジトリ同梱の MCP** を使う。

```bash
cp .env.example .env
# CMS_BASE_URL / CMS_ADMIN_API_KEY / CMS_SITE_ID を編集

npm install
npm run cms:mcp   # "Server ready" と出れば OK
```

| パス | 内容 |
|------|------|
| `cms-agent/` | Admin API クライアント（`@headless/cms-agent`） |
| `cms-mcp/` | MCP サーバー本体 |
| `cms-mcp/README.md` | フロント向け詳細・Cursor 設定例 |

### CMS repo（CMS 開発者向け）

```bash
npm install
npm run cms:mcp   # packages/headless-cms-mcp を起動
```

| パス | 内容 |
|------|------|
| `packages/headless-cms-agent/` | 共有ライブラリ |
| `packages/headless-cms-mcp/` | MCP サーバー（推奨） |
| `mcp/headless-cms/` | 旧配置（レガシー） |

---

## 環境変数

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `CMS_ADMIN_API_KEY` | **本番で必須** | 開発: `admin-dev-key` | 管理 API キー（`x-api-key` ヘッダー） |
| `CMS_BASE_URL` | いいえ | `http://localhost:3000` | CMS の origin（例: `https://headless-cms0529.vercel.app`） |
| `CMS_SITE_ID` | いいえ | `main-site` | デフォルトサイト slug |

本番 Vercel では `admin-dev-key` は使えない。CMS 管理者が Vercel の CMS プロジェクト env に設定したキーを共有すること。

---

## Cursor MCP 設定

`~/.cursor/mcp.json` または Cursor Settings → MCP。

### フロント repo から起動（推奨）

```json
{
  "mcpServers": {
    "headless-cms": {
      "command": "npm",
      "args": ["run", "cms:mcp"],
      "cwd": "/ABSOLUTE/PATH/TO/headless-front",
      "env": {
        "CMS_ADMIN_API_KEY": "your-admin-api-key",
        "CMS_BASE_URL": "https://headless-cms0529.vercel.app",
        "CMS_SITE_ID": "main-site"
      }
    }
  }
}
```

`cwd` は **フロント repo のルート**（`package.json` があるディレクトリ）。`CMS_ADMIN_API_KEY` は Cursor の MCP env に置く（`.env` を Cursor が自動読みしない場合がある）。

設定後、Cursor を再起動するか MCP サーバーを Reload する。

---

## 利用可能ツール

| ツール | 説明 |
|--------|------|
| `cms_list_content` | コンテンツ一覧（ID 探索） |
| `cms_get_content` | 単一レコード取得（`dataJson` + `fieldFormats`） |
| `cms_save_draft` | 下書き保存（非公開） |
| `cms_publish` | 公開（配信 API へ `revalidateTag` で即時反映） |
| `cms_set_field` | 単一フィールドパスの値を更新して下書き保存 |
| `cms_add_field` | フィールドパスを追加（Admin Root の「フィールド追加」相当） |
| `cms_upload_asset` | 画像アップロード |

---

## 典型ワークフロー（AI への指示例）

```
1. cms_list_content で topPage の content ID を確認
2. cms_get_content で card3_1 など現在の dataJson を確認
3. cms_set_field で path=card3_1.title, value="新しいタイトル" を設定
4. cms_publish で公開
5. フロント URL を再読み込みして反映確認
```

自然言語の例:

> 「main-site の topPage を取得して、`card3_1.text` を『こんにちは』に変えて公開して」

エージェントが上記ツールを順に呼ぶ。

---

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| `CMS_ADMIN_API_KEY is required` | MCP env 未設定 | Cursor MCP 設定または `.env` にキーを追加 |
| `401 missing_api_key` / `invalid_api_key` | キー不一致 | Vercel env の値と共有キーを照合 |
| `admin-dev-key` が本番で効かない | 本番は開発フォールバック無効 | 本物の `CMS_ADMIN_API_KEY` を使う |
| 変更がフロントに出ない | 下書きのまま | `cms_publish` を実行 |
| MCP ツールが見えない | サーバー未起動 / 設定ミス | `npm run cms:mcp` で手動起動確認、`cwd` を確認 |

---

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [cms-agent.md](./cms-agent.md) | CLI / MCP 構成・共有ライブラリ |
| [cms-cli.md](./cms-cli.md) | ターミナル CLI |
| [delivery-guide.md](../delivery-guide.md) §4 | API キー種別・本番設定 |
| フロント `cms-mcp/README.md` | フロント repo 向けクイックリファレンス |
