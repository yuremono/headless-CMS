# Preview Demo Frontend

ヘッドレス CMS の配信 API / プレビュー API を検証するための最小デモフロントです。  
CMS 本体（`app/`）とは分離され、**デモ・検証専用**です。

## 前提

- CMS 開発サーバー: `http://localhost:3000`（`npm run dev`）
- このデモ: 別ポートで静的配信（例: `http://localhost:3001`）
- CMS は HTML を配信しません。JSON のみ取得してここで描画します

## Seed 後の開発用 ID（既定値）

`npm run prisma:seed`（または `npx tsx prisma/seed.ts`）後、`js/config.js` のデフォルトは次の値に合わせています。

| 項目 | 値 |
|------|-----|
| サイト slug | `main-site` |
| siteId | `cmpqutfrd0001zubo3cya627a` |
| topPage contentId | `cmpqwarp30009c8bow1pd00fn` |
| page slug | `about`（collection は slug で参照。contentId は再 seed ごとに変わる） |
| 公開 API キー | `public-dev-key` |
| プレビュートークン | `preview-dev-token` |

再 seed で topPage の `contentId` が変わったら `js/config.js` と本表を更新してください。

slug（`main-site` 等）は API パスには使えません。必ず `siteId`（UUID）を指定してください。

## 起動方法

### 1. CMS を起動

```bash
npm run dev
```

### 2. デモフロントを配信

任意の静的サーバーで `examples/preview/` を配信します。

```bash
# Python 3
cd examples/preview
python3 -m http.server 3001

# または npx
npx --yes serve examples/preview -l 3001
```

ブラウザで `http://localhost:3001` を開きます。  
seed 済みなら `config.js` の既定値だけで topPage の下書きプレビューが表示されます。

### 3. 設定を指定

`js/config.js` を編集するか、URL クエリで上書きします。

| 設定名 | 説明 | seed 後の例 |
|--------|------|-------------|
| `apiBaseUrl` | CMS の origin | `http://localhost:3000` |
| `siteId` | サイト ID（DB の `site.id`） | `cmpqutfrd0001zubo3cya627a` |
| `contentType` | コンテンツ種類 | `topPage` / `page` |
| `contentId` | 単一取得用 ID（single 種別） | `cmpqwarp30009c8bow1pd00fn` |
| `slug` | collection 用スラッグ | `about` |
| `publicApiKey` | 公開 API キー | `public-dev-key` |
| `previewToken` | プレビュートークン | `preview-dev-token` |

#### URL クエリ例

管理画面（CMS）が `lib/preview/build-preview-url` で生成する形式と一致させています。  
必須: `siteId`, `contentType`, `previewToken`。種別に応じて `slug` または `contentId` を付与します。

topPage（single・ID 指定）:

```txt
http://localhost:3001/?siteId=cmpqutfrd0001zubo3cya627a&contentType=topPage&contentId=cmpqwarp30009c8bow1pd00fn&previewToken=preview-dev-token
```

下層ページ（collection・slug 指定）:

```txt
http://localhost:3001/?siteId=cmpqutfrd0001zubo3cya627a&contentType=page&slug=about&previewToken=preview-dev-token
```

公開データ（プレビュートークンなし・topPage）:

```txt
http://localhost:3001/?siteId=cmpqutfrd0001zubo3cya627a&contentType=topPage&contentId=cmpqwarp30009c8bow1pd00fn
```

下書きプレビュー（contentType のみ・config 既定の topPage / contentId を使用）:

```txt
http://localhost:3001/?siteId=cmpqutfrd0001zubo3cya627a&contentType=topPage&previewToken=preview-dev-token
```

## 管理画面プレビューリンクとの対応

CMS 管理画面の「プレビューを開く」は `lib/preview/build-preview-url.ts` が次のクエリを組み立てます。

| 種別 | クエリパラメータ |
|------|-----------------|
| single（例: topPage） | `siteId`, `contentType`, `contentId`, `previewToken` |
| collection（例: page） | `siteId`, `contentType`, `slug`, `previewToken` |

デモ側 `js/main.js` の `resolveConfig` は同じキー名で URL クエリを読み取り、`config.js` のデフォルトとマージします。

`.env` に `FRONTEND_BASE_URL=http://localhost:3001` を設定すると、管理画面から上記形式のリンクが有効になります。  
開発時トークンは `preview-dev-token`（`lib/auth` の dev フォールバックと同一）。

## API URL・クエリ形式

### 公開取得

```txt
GET {apiBaseUrl}/api/sites/{siteId}/content/{contentType}
GET {apiBaseUrl}/api/sites/{siteId}/content/{contentType}/{contentId}
GET {apiBaseUrl}/api/sites/{siteId}/content/{contentType}?slug=about
```

ヘッダー:

```txt
x-api-key: {publicApiKey}
```

### プレビュー（下書き）

上記 URL にクエリを追加:

```txt
?draft=true&previewToken={previewToken}
```

`topPage` など slug を持たない single 種別は、一覧取得（先頭 1 件）または `contentId` 指定で取得します。

### レスポンス想定

単一:

```json
{
  "id": "...",
  "contentType": "topPage",
  "status": "draft",
  "dataJson": {
    "seo": { "title": "..." },
    "hero": { "title": "...", "lead": "..." },
    "sections": [
      { "type": "textBlock", "id": "sec_...", "data": { "title": "...", "body": "<p>...</p>" } }
    ]
  }
}
```

一覧（single / collection 共通）:

```json
{
  "items": [ /* ContentRecord[] */ ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## 対応セクション型

`dataJson.sections`（sectionArray）を type ごとに簡易表示します。

| type | 主な data フィールド |
|------|---------------------|
| `hero` | title, lead, image, button |
| `titleGroup` | title, lead / subtitle |
| `textBlock` | title, body（HTML） |
| `imageText` | title, body, image, imagePosition |
| `cardList` | title, cards[] |
| `featureList` | title, items[] |
| `faq` | title, items[]（question / answer） |
| `cta` | title, lead, button |
| `newsList` | title, items[] |
| `gallery` | title, images[] |
| `companyProfile` | companyName, description |
| `access` | title, address, mapUrl |
| `contactLead` | title, lead, button |

未対応 type は JSON フォールバック表示です。

`topPage` には sectionArray 外のページレベル `hero` オブジェクトも別途表示します。

## ファイル構成

```txt
examples/preview/
├── index.html
├── css/preview.css
├── js/
│   ├── config.js    # デフォルト設定
│   ├── api.js       # 配信 / プレビュー API 取得
│   ├── sections.js  # セクション描画
│   └── main.js      # エントリ
└── README.md
```

## API 統合後に必要な調整

Prisma 統合・本番 API キー導入後は、以下を確認してください。

1. **siteId**  
   seed 後の `site.id`（UUID）を `config.js` または URL クエリに設定する。slug（`main-site`）は API パスには使えない。

2. **API キー**  
   開発フォールバック（`public-dev-key`）から、DB 発行の公開キーへ差し替える。  
   CMS 側 env: `CMS_PUBLIC_API_KEY` または `CMS_PUBLIC_API_KEY_{SITE}`。

3. **プレビュートークン**  
   管理画面が発行するトークンに合わせる。  
   CMS 側 env: `CMS_PREVIEW_TOKEN` または `CMS_PREVIEW_TOKEN_{SITE}`。

4. **CORS**  
   別 origin（例: `:3001` → `:3000`）から fetch するため、CMS に preview origin の CORS 許可が必要。未実装なら API 側で `FRONTEND_BASE_URL` を許可リストに追加する。

5. **レスポンス形**  
   `dataJson` フィールド名・ネストが Prisma レイヤーで変わった場合、`js/main.js` の `readDataJson` と `js/sections.js` のフィールド読み取りを合わせる。

6. **認証エラー**  
   401/403 時は API の `{ error, code }` メッセージを画面に表示。キー・トークン・siteId の組み合わせを再確認する。

## 注意

- 本ディレクトリの CSS / markup はデモ専用です。CMS 配信 JSON や `app/` には混入させません。
- `body` 等の HTML フィールドは CMS サニタイズ済み前提で `innerHTML` 相当表示しています（デモ用途）。
