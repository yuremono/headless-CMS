# Preview Demo Frontend

ヘッドレス CMS の配信 / プレビュー API を検証する **HTML + JavaScript** デモです。  
CMS 本体（`app/`）とは分離され、**デモ・検証専用**です。

## 推奨開発フロー（API プレビュー）

別 origin（`:3001`）から CMS 配信 API（`:3000`）へ `fetch` する最小構成です。

```bash
# ターミナル 1: CMS（配信 API）
npm run dev
# → http://localhost:3000

# ターミナル 2: プレビュー静的サーバー
cd examples/preview && python3 -m http.server 3001
# → http://localhost:3001
```

1. `.env` に `FRONTEND_BASE_URL=http://localhost:3001` を設定（CORS 許可 origin）
2. ブラウザで `http://localhost:3001/` を開く（`js/config.js` の既定値で topPage を取得）
3. 下書き確認は `previewToken` 付き URL、または管理画面の「プレビューを開く」

CORS はルートの `proxy.js` が `/api/*` へ `Access-Control-Allow-Origin` 等を付与します（Next.js 16 の proxy 規約。旧 `middleware.mjs` は `.mjs` が pageExtensions 外のため検出されませんでした）。

### 認証（開発）

| 項目 | 既定値 |
|------|--------|
| 公開 API キー（`x-api-key`） | `public-dev-key` |
| プレビュートークン | `preview-dev-token` |

`js/config.js` と `lib/auth` の開発フォールバックが一致しています。本番では環境変数 / サイト API キーを使用してください。

## 静的 HTML エクスポート（オフライン確認）

API・CORS なしで公開 HTML を目視する場合:

1. CMS を起動: `npm run dev`
2. 管理画面で保存 → `lib/static-export` が `generated/` に HTML を再生成
3. `generated/*.html` を直接開く、または `index.html?generated=1`

詳細: [generated/README.md](./generated/README.md)

## 表示モード

| モード | 開き方 | サーバー |
|--------|--------|----------|
| **API プレビュー**（推奨・開発） | `http://localhost:3001/` | CMS `:3000` + 静的 `:3001` |
| **静的 HTML** | `generated/topPage.html` など | 不要 |
| **静的ハブ** | `index.html?generated=1` | 任意 |

## Seed 後の開発用 ID

`npm run prisma:seed` 後、`js/config.js` のデフォルト:

| 項目 | 値 |
|------|-----|
| サイト slug | `main-site` |
| siteId | `cmpqutfrd0001zubo3cya627a` |
| topPage contentId | `cmpqwarp30009c8bow1pd00fn` |
| page slug | `about` |

再 seed で ID が変わったら `js/config.js` を更新してください。

## URL クエリ（API プレビュー）

管理画面（`lib/preview/build-preview-url`）と同じ形式:

| 設定名 | 説明 |
|--------|------|
| `siteId` | サイト ID（UUID） |
| `contentType` | `topPage` / `page` 等 |
| `contentId` | single 種別 |
| `slug` | collection 種別 |
| `previewToken` | 下書き用 |

例（topPage・下書き）:

```txt
http://localhost:3001/?siteId=cmpqutfrd0001zubo3cya627a&contentType=topPage&contentId=cmpqwarp30009c8bow1pd00fn&previewToken=preview-dev-token
```

## CMS から generated を配信（任意）

- `http://localhost:3000/preview/generated/manifest.json`
- `http://localhost:3000/preview/generated/topPage.html`

## ファイル構成

```txt
examples/preview/
├── index.html
├── generated/
├── css/preview.css
├── js/
│   ├── config.js    # apiBaseUrl, siteId, publicApiKey 等
│   ├── api.js       # 配信 API fetch
│   ├── sections.js
│   ├── mode.js
│   ├── generated-hub.js
│   └── main.js
└── README.md
```

## 注意

- 本ディレクトリの CSS / markup はデモ専用です。CMS 配信 JSON には混入させません。
- `generated/*.html` はローカル生成物（Git 非追跡、`README` のみ）。
