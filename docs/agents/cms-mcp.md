# CMS MCP

Cursor などのエージェントから CMS を操作するための MCP サーバー。DB には直接接続せず、Admin API 経由で操作する。

## 起動

```bash
npm install
npm run cms:mcp
```

必要な環境変数:

| 変数 | 内容 |
| --- | --- |
| `CMS_BASE_URL` | CMS の URL。未設定時は `APP_URL` または `http://localhost:3000` |
| `CMS_ADMIN_API_KEY` | 管理 API キー |
| `CMS_SITE_ID` | 互換用のサイト ID。通常は `main-site` |

## Cursor 設定例

```json
{
  "mcpServers": {
    "headless-cms": {
      "command": "npm",
      "args": ["run", "cms:mcp"],
      "cwd": "/ABSOLUTE/PATH/TO/HEADLESS_FRONT",
      "env": {
        "CMS_BASE_URL": "https://headless-cms0529.vercel.app",
        "CMS_ADMIN_API_KEY": "your-admin-api-key",
        "CMS_SITE_ID": "main-site"
      }
    }
  }
}
```

案件フロント側で MCP を使う場合は、フロントリポジトリの設定に従う。CMS リポジトリ内のデモフロントは持たない。

## 主なツール

| ツール | 用途 |
| --- | --- |
| `cms_list_content` | コンテンツ一覧 |
| `cms_get_content` | 単一コンテンツ取得 |
| `cms_save_draft` | 下書き保存 |
| `cms_publish` | 公開 |
| `cms_set_field` | フィールド更新 |
| `cms_add_field` | フィールド追加 |
| `cms_upload_asset` | 画像アップロード |

## 禁止事項

- Prisma / raw SQL で DB を直接変更しない。
- `migrate reset` や seed 再投入を実行しない。
- 秘密情報をリポジトリに保存しない。

CLI の詳細は `docs/agents/cms-cli.md` を参照。
