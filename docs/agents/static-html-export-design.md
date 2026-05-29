# 静的 HTML エクスポート設計（デモ / examples 専用）

**最終更新:** 2026-05-29  
**ステータス:** **部分実装**（`lib/static-export/`）  
**スコープ:** `examples/preview/` 向けのリポジトリ内 HTML 生成。配信 API は引き続き JSON のみ。

### 実装メモ（2026-05-29）

| 項目 | 状態 |
|------|------|
| モジュール | `lib/static-export/`（設計案の `lib/export/preview-static/` ではなくこちらに集約） |
| 出力先 | `examples/preview/generated/{draft\|published}/{contentType}/{slug\|id}.html`（設計どおり） |
| サイト slug 階層 | **採用しない** — seed / デモは単一サイト（`main-site`）前提。複数サイト時は Phase 2 で `generated/{siteSlug}/draft/...` を検討 |
| トリガー | `lib/content/store.ts` の `updateContent` / `publishContent` / `unpublishContent` 成功後に `scheduleContentExport`（失敗はログのみ） |
| バッチ | `npm run export:preview`（`scripts/export-preview.ts`）、`prisma db seed` 末尾の `exportSiteContent` |
| unpublish | `generated/published/...` を削除。`generated/draft/...` は DB 通り更新 |
| 未着手 | `PREVIEW_STATIC_EXPORT` 無効化、`build-preview-url` の静的パス、`createContent` / `deleteContent` フック、manifest 自動更新、レンダラーと `sections.js` の完全共有 |

---

## 概要

CMS 管理操作のたびに、デモ用の完全な HTML ファイルをリポジトリ内へ生成・上書きする。生成物は **配信 API の代替ではなく**、制作検証・クライアント共有・リポジトリ外へのフォルダコピー用のアーティファクトとする。

`SPEC.md` §2.1 のヘッドレス原則は **本番フロント・配信 API には維持**する。本機能は AGENTS.md の「デモ専用の例外」として、`examples/preview/` 配下に限定する。

---

## 要件

| # | 要件 |
|---|------|
| R1 | コンテンツ編集（下書き保存・公開・非公開・セクション PATCH）後、対象ページの HTML が自動で上書きされる |
| R2 | 生成 HTML は CMS プロセスなしで開ける（リポジトリ外・`file://`・任意静的サーバー） |
| R3 | CMS 編集直後に同じパスを開くと更新内容が反映されている |
| R4 | 配信 API（`/api/sites/...`）は JSON のみ。HTML は返さない |
| R5 | デモ用 markup / CSS は `examples/preview/` に閉じ、CMS の `app/` や配信 JSON に表示ロジックを混ぜない |
| R6 | 既存 `examples/preview/js/sections.js` のセクション描画セマンティクスと整合する |

### 成功基準（実装フェーズ用）

- [x] `topPage`（single）と `page`（collection・slug）について、公開版・下書き版の HTML が規定パスに存在する（`exportSiteContent` / 保存フック）
- [x] 管理 API で PATCH / publish / unpublish / section PATCH 後、該当ファイルが更新される（store フック経由）
- [x] `python3 -m http.server` を `generated/published/` に向けたとき、API キー・CORS・CMS 起動なしで表示できる
- [x] 配信 API のレスポンス形式・認証は変更しない

---

## 出力ディレクトリ構造

```
examples/preview/
├── index.html              # 既存: ランタイム API 取得モード（レガシー / フォールバック）
├── css/preview.css         # 共有スタイル（生成 HTML から相対参照）
├── js/                     # 既存デモ（API モード用）
│   ├── sections.js         # 描画ロジックの単一ソース（移行後は lib から再エクスポート可）
│   └── ...
└── generated/              # ★ CMS が書き込む（git 追跡推奨: デモ即時確認のため）
    ├── manifest.json       # エクスポート対象一覧・最終実行時刻（任意・デバッグ用）
    ├── draft/              # 下書きプレビュー用（includeDraft 相当）
    │   ├── topPage/
    │   │   └── {contentId}.html
    │   └── page/
    │       └── {slug}.html
    └── published/          # 公開データのみ（配信 API と同条件）
        ├── topPage/
        │   └── {contentId}.html
        └── page/
            └── {slug}.html
```

### パス規則

| 種別 | ファイル名 | 例 |
|------|------------|-----|
| `single` | `{contentId}.html` | `generated/published/topPage/cmpqwarp....html` |
| `collection` | `{slug}.html`（slug 必須。無い場合は `{contentId}.html` にフォールバック） | `generated/draft/page/about.html` |

slug に `/` や `..` が含まれる場合はサニタイズ（ファイル名安全化）する。

### 生成される 1 ファイルの形（推奨）

**完全スタンドアロン HTML（埋め込みコンテンツ）** を第一選択とする。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>{seo.title | content.title}</title>
    <link rel="stylesheet" href="../../css/preview.css" />
    <!-- 任意: デバッグ用。本番デモ閲覧には不要 -->
    <script type="application/json" id="cms-export-payload">…ContentRecord…</script>
  </head>
  <body>
    <header>…ステータスバッジ（Draft / Published）…</header>
    <main>…sections.js 相当でサーバー側レンダリング済みの HTML…</main>
    <footer>…</footer>
  </body>
</html>
```

| 方式 | リポジトリ外で動くか | CMS 編集後の即時性 | 推奨 |
|------|---------------------|-------------------|------|
| **A. サーバー側で markup を埋め込み**（上記） | ◎（CSS 相対パスのみ） | ◎（ファイル上書き） | **採用** |
| B. 空 shell + `fetch` 配信 API | △（CMS・キー・CORS 必要） | ◎ | 既存 `index.html` のみ |
| C. shell + 埋め込み JSON + クライアント `sections.js` | ◎ | ◎ | A の簡易版。JS 必須 |

画像・ファイル URL は DB 上の絶対/相対 URL をそのまま `src` に載せる（MVP ではバイナリ同梱しない）。オフライン完全再現が必要なら Phase 2 でアセットミラー `generated/assets/` を検討。

---

## トリガー（いつ生成するか）

エクスポートは **DB 更新が成功した直後** に 1 コンテンツ単位で実行する。ルートハンドラに散らさず、**サービス層の単一フック**から呼ぶ。

| 操作 | HTTP | ルート | サービス関数 | 生成対象 |
|------|------|--------|--------------|----------|
| 下書き保存 | `PATCH` | `app/api/admin/sites/[siteId]/content/[contentType]/[id]/route.ts` | `updateAdminContent` | **draft** のみ（published ツリーは触らない※） |
| 新規作成 | `POST` | `.../content/[contentType]/route.ts` | `createAdminContent` | **draft** |
| セクション更新 | `PATCH` | `.../[id]/sections/[sectionId]/route.ts` | `patchContentSection`（`patchAdminSection`） | **draft** |
| 公開 | `POST` | `.../[id]/publish/route.ts` | `publishAdminContent` | **draft** + **published** |
| 非公開 | `POST` | `.../[id]/unpublish/route.ts` | `unpublishAdminContent` | **published** を削除またはスタブ化、**draft** は最新 DB で更新 |
| 削除 | `DELETE` | `.../[id]/route.ts` | `removeAdminContent` | draft / published 両方の該当 HTML を削除 |

※ 下書き保存時に published 版も変えたい場合は「公開済みの同一 id」のみ published も再生成（公開データは `publishedAt` 時点のスナップショットではなく常に DB の `data_json` を published フィルタで読む現行 store セマンティクスに合わせる）。仕様として **公開中の編集は draft のみ更新し、publish 操作まで published HTML は変えない** 方が安全。公開フローは「プレビュー確認 → 公開」に沿う。

### 再エクスポート（バッチ）

| 手段 | 用途 |
|------|------|
| `npm run export:preview`（新規 CLI） | 初回セットアップ・全件再生成・CI |
| 管理 API `POST .../export-preview`（任意） | 手動フル同期。`lib/db/site-export` の JSON エクスポートとは別 |

---

## draft と published の違い

| 観点 | `generated/draft/` | `generated/published/` |
|------|-------------------|------------------------|
| データ取得 | `getContent(..., includeDraft: true)` 相当 | `includeDraft: false` かつ `status === 'published'` |
| 表示できる状態 | draft / published / unpublished すべて（管理画面と同じ本文） | **published のみ**。未公開・下書きのみのコンテンツはファイルなし or 削除 |
| ヘッダー表示 | `Preview (draft): {title}` | `Published: {title}` |
| 管理プレビューリンク | `FRONTEND_BASE_URL` を `.../generated/draft/...` に向ける候補 | 公開確認用。クライアント共有向け |
| unpublish 後 | draft HTML は残す（内容は DB 通り） | 該当 HTML を **削除** するか、`410` 説明のスタブ HTML に置換 |

配信 API との対応（`lib/content/service.ts` `resolveDeliveryRequest`）:

- 公開 JSON: `draft` クエリなし → published のみ
- プレビュー JSON: `draft=true` + `previewToken` → 下書き含む

静的 HTML はこの 2 モードを **ディレクトリで物理分離**するイメージ。

---

## コードベースのフックポイント（実装時の配置）

新規モジュール（案）:

| ファイル | 責務 |
|----------|------|
| `lib/export/preview-static/config.ts` | エクスポート対象 siteId・contentType 一覧（env または `preview-export.json`） |
| `lib/export/preview-static/render.ts` | `sections.js` と同等の markup 生成（Node 実行可能） |
| `lib/export/preview-static/write.ts` | パス解決・原子書き込み（tmp → rename） |
| `lib/export/preview-static/sync-one.ts` | 1 レコード分 draft / published 同期 |
| `lib/export/preview-static/trigger.ts` | `triggerPreviewStaticExport({ siteId, contentType, id, reason })` |

**呼び出し元（サービス層・推奨）**

```txt
lib/content/service.ts
  updateAdminContent      → trigger (draft)
  createAdminContent      → trigger (draft)
  publishAdminContent     → trigger (draft + published)
  unpublishAdminContent   → trigger (published cleanup + draft)
  removeAdminContent      → trigger (delete files)
lib/content/section-patch.ts
  patchContentSection     → trigger (draft)  ※ service 経由の re-export ではなく store 更新後
```

**呼び出しを避ける層**

- `app/api/admin/.../route.ts` 直書き（重複・テスト困難）
- 配信 API `app/api/sites/...`（JSON のみの原則を壊す）

**描画ロジックの共有**

現状 `examples/preview/js/sections.js` はブラウザ ESM。実装時は次のいずれか:

1. **推奨:** `lib/preview/section-render/` に TypeScript 化して移し、`sections.js` はビルド成果物または薄い re-export
2. 暫定: `sections.js` を Node で `import` できるよう `package.json` `"type":"module"` と拡張子調整（型なし）

`examples/preview/js/main.js` の `readDataJson` / `renderPageHero` / `renderSections` フローを `sync-one.ts` 内で再現する。

**関連（変更しないが参照する）**

| パス | 関係 |
|------|------|
| `lib/content/store.ts` | `publishContent` / `unpublishContent` / `getContent` の status フィルタ |
| `lib/preview/build-preview-url.ts` | プレビュー URL を API クエリ形式から `generated/draft/...html` に切替可能 |
| `lib/db/site-export.ts` | サイト JSON 一括エクスポート（別機能） |

---

## 環境変数・設定（案）

| 変数 | 既定 | 意味 |
|------|------|------|
| `PREVIEW_STATIC_EXPORT` | `true`（開発） / `false`（本番 CMS のみデプロイ時） | フック有効化 |
| `PREVIEW_STATIC_ROOT` | `{repo}/examples/preview/generated` | 出力ルート |
| `FRONTEND_BASE_URL` | 既存 | 管理画面プレビューリンク。静的化後は `http://localhost:3001/generated/draft/...` 等 |

エクスポート対象コンテンツは MVP で seed 相当の固定リスト（`topPage` 1 件 + `page` slug 一覧）でもよい。Phase 2 で「エクスポート対象」フラグを content model に持たせる。

---

## トレードオフ: 純ヘッドレス vs デモ静的エクスポート

| | 純ヘッドレス（現行） | 本設計（デモのみ） |
|--|---------------------|-------------------|
| **Pros** | 単一真実源は API・DB。フロント自由度高い | オフライン共有・即時目視・CORS/キー不要 |
| **Cons** | デモは CMS + 静的サーバー + キーが必要 | リポジトリ差分増、デモ markup と DB の二重管理感 |
| **スコープ** | 全案件フロント | `examples/preview/generated/` のみ |
| **Git** | コードのみ | 生成 HTML をコミットするかはチーム方針（即時デモなら commit、ノイズなら gitignore + CI 生成） |

**境界ルール（必須）**

1. 配信 API・管理 API のレスポンスに HTML フィールドを追加しない  
2. `lib/export/preview-static` を案件フロントから import しない  
3. セクションの「見た目」はデモ CSS に限定。CMS スキーマや `data_json` に presentation を入れない  
4. 本番クライアントサイトのビルドパイプラインには組み込まない  

---

## `python3 -m http.server 3001` ワークフローからの移行

### 現状

```bash
cd examples/preview && python3 -m http.server 3001
# → index.html が js/main.js で CMS :3000 を fetch
```

依存: CMS 起動、`x-api-key`、プレビュー時は `previewToken`、CORS。

### 移行後（推奨運用）

```bash
# 1. CMS で編集 → generated/ が自動更新（CMS 起動中のみ書き込みに CMS が要る）

# 2. 公開版デモ閲覧（CMS 不要）
cd examples/preview/generated/published
python3 -m http.server 3001
# → http://localhost:3001/topPage/{contentId}.html

# 3. 下書きプレビュー（CMS 不要・ファイルは編集直後に更新）
cd examples/preview/generated/draft
python3 -m http.server 3002
```

| 用途 | URL 例 |
|------|--------|
| 公開デモ | `http://localhost:3001/page/about.html` |
| 下書きデモ | `http://localhost:3002/topPage/{contentId}.html` |
| レガシー API モード | 既存 `examples/preview/index.html`（ドキュメントに「開発・API 検証用」と明記） |

**リポジトリ外へコピー**

`examples/preview/generated/published/` と `examples/preview/css/` をセットでコピーすれば、別マシンでも静的サーバー 1 本で再現可能（画像 URL が CMS ホスト向きの場合はネットワーク要）。

**管理画面プレビューリンク**

`lib/preview/build-preview-url.ts` を拡張し、`FRONTEND_BASE_URL` + `/generated/draft/{contentType}/{slug|id}.html` を返すモードを追加。トークンクエリは不要になる。

### 移行ステップ（実装順）

1. 手動 CLI で `generated/` を初回生成  
2. サービス層フックで自動化  
3. README / `docs/delivery-guide.md` の手順を「API デモ」と「静的生成デモ」に分岐  
4. （任意）`index.html` から `generated/draft/` へリダイレクト  

---

## テスト戦略（実装フェーズ）

| 種別 | 内容 |
|------|------|
| ユニット | `render.ts` が `sections.js` と同じ type の入力で同じ markup を出す（スナップショット） |
| ユニット | パス規則・slug サニタイズ・unpublish 時のファイル削除 |
| 結合 | `patchContentSection` 後に `generated/draft/...` が更新される（temp dir） |
| E2E（任意） | publish → `generated/published` が存在、unpublish → 削除 |

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| 書き込み失敗で API は成功する | フックは try/catch でログのみ。失敗時は CLI 再実行で修復 |
| 並行編集でファイル競合 | コンテンツ id 単位の原子 rename。全件ロックは不要 |
| 生成 HTML の XSS | 既存と同様 richText は CMS サニタイズ済み前提。エスケープは `sections.js` 準拠 |
| git 差分ノイズ | `manifest.json` のみ commit、HTML は gitignore + CI 生成、など方針を README に明記 |
| 本番 CMS で不要な disk I/O | `PREVIEW_STATIC_EXPORT=false` で無効化 |
| レンダラー二重保守 | 共有 `lib/preview/section-render` へ一本化 |

---

## 関連ドキュメント

- `SPEC.md` §2.1 — ヘッドレス原則（配信の正）
- `AGENTS.md` — デモと CMS の分離
- `docs/agents/architecture.md` — API 二層・status・プレビュー
- `examples/preview/README.md` — 現行 API デモ手順

---

## 決定サマリ

| 項目 | 決定 |
|------|------|
| 出力先 | `examples/preview/generated/{draft\|published}/{contentType}/...` |
| スタンドアロン方式 | サーバー側レンダリング済み HTML 埋め込み（方式 A） |
| トリガー | `lib/content/service.ts` + `section-patch.ts` 成功後の単一フック |
| API | JSON のみ維持。HTML はファイルエクスポートのみ |
| スコープ | デモ / examples のみ。案件フロントには適用しない |
