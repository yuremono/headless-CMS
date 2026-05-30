# ヘッドレス型 簡易CMS 要件定義書 v0.2

[重要]このドキュメントは開発当初の内容として残しておくための仕様変更による編集は不要

## 1. 目的

本CMSは、Web制作会社がコーポレートサイト、採用サイト、サービスサイト、LP、オウンドメディア等を制作・納品する際に利用できる、**ヘッドレスCMS基盤**である。

主目的は、表示フロントエンドをCMSに依存させず、CMS側では以下に専念すること。

```txt
データを作成・編集・保存する
API経由でフロントエンドへ配信する
編集者が安全にコンテンツを更新できる
AIや外部ツールからも扱いやすい構造を提供する
```

本CMSは、WordPressのようなテーマ一体型CMSではなく、Next.js、Astro、Nuxt、Laravel、Rails、静的HTML生成など、任意の技術スタックから利用可能な**APIファーストのCMS**として設計する。

---

## 2. 基本方針

### 2.1 ヘッドレスであること

CMSは画面表示を担当しない。
CMSは以下のみを担当する。

* コンテンツ種類の管理
* コンテンツデータの保存
* 画像・ファイルの管理
* 公開状態の管理
* API配信
* プレビュー用データ配信
* 権限管理
* 変更履歴管理

フロントエンドのHTML、CSS、JavaScript、ルーティング、デザイン表現は各プロジェクト側で実装する。

---

### 2.2 セクション型データは「テンプレート」として扱う

セクション型データはCMSの固定仕様ではなく、**制作会社がよく使う構造テンプレート**として提供する。

例：

```txt
hero
imageText
cardList
faq
cta
newsList
companyProfile
access
```

ただし、これらは表示コンポーネントではなく、あくまで**構造化されたデータ型**である。

CMSは「このデータをどう見せるか」までは責任を持たない。

---

### 2.3 MicroCMSの完全代替は目指さない

初期段階では、以下を目指さない。

* 誰でも自由にAPIを無制限作成できる汎用CMS
* 大規模メディア向けの高度な承認フロー
* 複雑な会員制コンテンツ
* EC機能
* プラグインマーケットプレイス
* 多言語・多拠点の大規模運用

初期の対象は、**制作会社が自社案件で管理しきれる範囲の簡易CMS**とする。

---

### 2.4 運用形態（確定）

**案件ごとにCMSを別デプロイする**（1案件 ≒ 1CMSインスタンス）。

| 項目 | 方針 |
|------|------|
| デプロイ | クライアント案件ごとに独立したCMS環境 |
| データ | 他案件と混在しない（マルチテナントSaaSは想定しない） |
| サイト | 1デプロイあたり基本1サイト。API・管理画面はシンプルに保つ |
| 納品 | CMSごとにAPIキー・管理画面URLを渡す |

---

## 3. 想定ユーザー

### 3.1 制作会社の管理者

CMSを案件ごとにセットアップする人。

主な操作：

* サイト作成
* コンテンツ種類定義
* APIキー発行
* 編集者アカウント作成
* 権限設定
* フロントエンドとの接続設定

---

### 3.2 制作会社の制作者

デザイナー、コーダー、フロントエンドエンジニア。

主な操作：

* コンテンツ構造の設計
* セクション型テンプレートの選択
* フロントエンドとのデータ接続
* プレビュー確認
* クライアント向け編集項目の制限

---

### 3.3 クライアント編集者

納品後にお知らせ、本文、画像などを編集する人。

主な操作：

* テキスト編集
* 画像差し替え
* お知らせ投稿
* 公開・非公開切り替え
* 下書き保存
* プレビュー確認

---

### 3.4 AIエージェント・外部ツール

将来的に、AIがコンテンツ編集や構造変更を行う対象。

主な操作：

* API経由でコンテンツ取得
* API経由で下書き作成
* セクション追加・更新
* 差分確認
* プレビューURL生成
* 編集提案の保存

---

## 4. 対象サイト

初期対象は以下。

* 小規模コーポレートサイト
* 採用サイト
* サービスサイト
* 店舗サイト
* LP
* お知らせ付き企業サイト
* ブログ・コラム付きサイト
* 制作会社のテンプレート納品案件

対象外：

* 大規模ニュースメディア
* 大規模EC
* 会員制SaaS
* 複雑な業務システム
* 数十人規模の編集部運用

---

## 5. システム概要

```txt
管理画面
  ↓
CMS API / Admin API
  ↓
Database / Storage
  ↓
Content Delivery API
  ↓
Next.js / Astro / Nuxt / PHP / 静的サイト等
```

CMSは以下の2種類のAPIを持つ。

### 5.1 管理API

コンテンツの作成・更新・削除・公開管理に使うAPI。

主な利用者：

* CMS管理画面
* 制作者
* AIエージェント
* 外部管理ツール

---

### 5.2 配信API

フロントエンドが公開コンテンツを取得するためのAPI。

主な利用者：

* Next.js
* Astro
* Nuxt
* Laravel
* Rails
* 静的サイトジェネレーター
* その他フロントエンド

---

## 6. 主要機能要件

## 6.1 サイト管理

### 必須機能

* サイト作成
* サイト名設定
* サイトID発行
* APIベースURL発行
* 公開APIキー発行
* 管理APIキー発行
* サイト単位のデータ分離

### 将来機能

* 複数環境管理
  例：development / staging / production
* サイト複製
* テンプレートから新規サイト作成
* 使用量確認

---

## 6.2 コンテンツ種類管理

コンテンツ種類（content type）とは、保存するデータの型である。AI/LLMの「モデル」と混同しないよう、本書では**コンテンツ種類**と表記する。

例：

```txt
news
page
topPage
staff
faq
service
```

### 定義方式（確定）

| 段階 | 方式 |
|------|------|
| MVP（種類のスキーマ） | 開発者がリポジトリ内の JSON（例: `content-types/*.json`）で定義し、デプロイ時にDBへ取り込む |
| MVP（編集） | **管理画面GUIは必須**。スキーマに基づく入力フォーム・一覧・公開操作を提供する |
| Phase 2以降 | 管理画面GUIからコンテンツ種類・フィールドを追加・変更できるように拡張 |

JSONファイルでスキーマを定義しても、**編集者向けGUIなしは不可**。GUIは製品の前提条件とする。

### 必須機能

* コンテンツ種類作成（Phase 2: GUI / MVP: JSON取り込み）
* 種類名設定
* APIエンドポイント名設定
* フィールド追加
* フィールド編集
* フィールド並び替え
* 必須項目設定
* 一覧表示項目設定

### フィールド型

MVPで必要なフィールド型：

```txt
text
textarea
richText
number
boolean
image
file
url
date
select
reference
array
object
sectionArray
```

用語補足：

* `richText`：装飾付き本文。**保存形式はHTML**。CMS側でサニタイズし、許可タグのみ保存・配信する（XSS対策）。
* `reference`：別コンテンツへの参照。例：記事が著者データを参照する。
* `array`：同じ型のデータを複数持つ配列。
* `object`：複数フィールドをひとまとまりにした入れ子構造。
* `sectionArray`：セクション型データを並べる配列。

---

## 6.3 セクション型データ管理

トップページや下層ページの本文を、複数のセクションデータとして保存する。

### データ例

```json
{
  "sections": [
    {
      "type": "hero",
      "id": "sec_hero_001",
      "data": {
        "title": "企業の未来をつくるWeb制作",
        "lead": "戦略設計から運用改善まで支援します。",
        "image": {
          "url": "https://example.com/hero.jpg",
          "alt": "オフィスで働くメンバー"
        },
        "button": {
          "label": "お問い合わせ",
          "href": "/contact"
        }
      }
    },
    {
      "type": "imageText",
      "id": "sec_image_text_001",
      "data": {
        "title": "私たちの強み",
        "body": "設計、デザイン、実装、運用まで一貫して対応します。",
        "imagePosition": "right"
      }
    }
  ]
}
```

### 必須機能

* セクション追加
* セクション削除
* セクション複製
* セクション並び替え
* セクション非表示
* セクションごとの編集
* セクション型ごとの入力UI切り替え
* セクションデータのJSON出力

### 初期セクションテンプレート

```txt
hero
titleGroup
textBlock
imageText
cardList
featureList
faq
cta
newsList
gallery
companyProfile
access
contactLead
```

ただし、CMS側では見た目を定義しない。
あくまでデータ構造を提供する。

---

## 6.4 コンテンツ編集

### 必須機能

* コンテンツ一覧
* コンテンツ作成
* コンテンツ編集
* 下書き保存
* 公開
* 非公開
* 更新日時表示
* 作成者表示
* スラッグ設定
* SEO情報設定

SEO情報：

```txt
title
description
ogTitle
ogDescription
ogImage
canonicalUrl
noindex
```

---

## 6.5 プレビュー

### 必須機能

* 下書き状態のプレビューAPI
* プレビュー用トークン発行
* **管理画面からプレビューURLリンクを表示**（編集者がクリックして確認できる）
* 公開前確認

### 想定フロー

```txt
CMSで編集
↓
下書き保存
↓
管理画面にプレビューURLリンクが表示される
↓
編集者がリンクを開く
↓
フロントエンド（examples/preview）が preview token 付きでCMS APIを叩く
↓
下書きデータを表示
```

### API例

```txt
GET /api/sites/{siteId}/content/{contentType}/about?draft=true&previewToken=xxxx
GET /api/sites/{siteId}/content/{contentType}/{id}?draft=true&previewToken=xxxx
```

`topPage` など slug を持たないコンテンツ種類は ID 指定で取得する。

プレビューURLは CMS が `{フロントエンドベースURL}?previewToken=xxxx&...` 形式で組み立て、管理画面にリンクとして出す。フロントエンドベースURLはサイト設定（環境変数）で指定する。

---

## 6.6 API配信

### 配信APIの基本要件

* REST APIで取得できる
* JSON形式で返却する
* 公開済みデータのみ返却する
* APIキーでアクセス制御する
* クエリで絞り込みできる
* 下書きは通常APIでは返さない

REST APIとは、URLとHTTPメソッドを使ってデータをやり取りするAPI設計のこと。
ここでは、Next.jsやAstroなどがCMSからJSONを取得するための入り口を指す。

### API例

```txt
GET /api/sites/{siteId}/content/{contentType}
GET /api/sites/{siteId}/content/{contentType}/{id}
GET /api/sites/{siteId}/content/{contentType}?limit=10&offset=0
GET /api/sites/{siteId}/content/{contentType}?slug=about
```

### レスポンス例

```json
{
  "id": "cnt_001",
  "contentType": "page",
  "slug": "about",
  "status": "published",
  "title": "私たちについて",
  "sections": [],
  "createdAt": "2026-05-29T10:00:00Z",
  "updatedAt": "2026-05-29T11:00:00Z",
  "publishedAt": "2026-05-29T12:00:00Z"
}
```

---

## 6.7 管理API

### 必須機能

* コンテンツ作成
* コンテンツ更新
* コンテンツ削除
* 下書き保存
* 公開
* 非公開
* 画像アップロード
* コンテンツ種類取得
* スキーマ取得

### API例

```txt
POST /api/admin/sites/{siteId}/content/{contentType}
PATCH /api/admin/sites/{siteId}/content/{contentType}/{id}
DELETE /api/admin/sites/{siteId}/content/{contentType}/{id}
POST /api/admin/sites/{siteId}/content/{contentType}/{id}/publish
POST /api/admin/sites/{siteId}/content/{contentType}/{id}/unpublish
```

---

## 6.8 画像・ファイル管理

### 必須機能

* 画像アップロード
* 画像一覧
* 画像削除
* altテキスト設定
* ファイルサイズ制限
* MIMEタイプ制限

MIMEタイプは、ファイルの種類を表す情報。
例：`image/jpeg`、`image/png`、`application/pdf`

### 将来機能

* 画像リサイズ
* WebP変換
* AVIF変換
* 使用中画像の削除防止
* フォルダ分類
* CDN配信

CDNは「Content Delivery Network」の略で、直訳すると「コンテンツ配信ネットワーク」。画像やファイルを高速に配信する仕組み。

---

## 6.9 権限管理

### 初期ロール

```txt
owner
admin
editor
viewer
```

### 権限

| ロール    | 内容                |
| ------ | ----------------- |
| owner  | サイト削除、APIキー管理、全権限 |
| admin  | コンテンツ種類管理、ユーザー管理、公開操作 |
| editor | コンテンツ作成・編集・公開     |
| viewer | 閲覧のみ              |

MVPでは複雑な権限管理は避ける。
ただし、APIキー管理と公開操作は最低限分離する。

---

## 6.10 変更履歴

### MVP必須

* 最終更新日時
* 最終更新者
* 公開日時
* 下書き状態の保持

### 将来機能

* バージョン履歴
* 差分表示
* 過去バージョンへの復元
* AI編集履歴
* 承認フロー

---

## 6.11 AI連携前提の要件

本CMSは将来的にAI編集を前提とする。

### 必須方針

* スキーマをAPIで取得できる
* セクションIDを安定して持つ
* セクションごとの差分更新ができる
* JSON構造が明確である
* 人間の入力UIとAI操作APIを分離できる
* 下書き状態でAI編集を試せる
* 公開前に人間が確認できる

### AI操作例

```txt
このページのheroセクションのtitleを変更する
faqセクションに項目を3件追加する
imageTextセクションの画像位置をleftに変更する
ctaセクションを非表示にする
```

### AI向けAPI例

```txt
GET /api/admin/sites/{siteId}/schemas
GET /api/admin/sites/{siteId}/content/{contentType}/{id}
PATCH /api/admin/sites/{siteId}/content/{contentType}/{id}/sections/{sectionId}
POST /api/admin/sites/{siteId}/content/{contentType}/{id}/sections
DELETE /api/admin/sites/{siteId}/content/{contentType}/{id}/sections/{sectionId}
```

---

## 7. 非機能要件

## 7.1 セキュリティ

### 必須

* 管理画面ログイン
* APIキー認証
* 公開APIキーと管理APIキーの分離
* CORS設定
* 入力値バリデーション
* ファイルアップロード制限
* SQLインジェクション対策
* XSS対策

CORSは「Cross-Origin Resource Sharing」の略。
別ドメインからAPIを呼び出すための許可設定。

XSSは「Cross-Site Scripting」の略。
不正なJavaScriptを埋め込まれる攻撃。

---

## 7.2 パフォーマンス

### 必須

* 一覧取得のページネーション
* 公開APIのキャッシュ対応
* 画像配信の最適化余地
* フロントエンド側のSSG/ISRに対応

SSGは「Static Site Generation」の略で、静的HTMLを事前生成する方式。
ISRは「Incremental Static Regeneration」の略で、静的ページを一定条件で再生成する方式。

---

## 7.3 可用性

MVPでは高可用性を過剰に追わない。

ただし、以下は必要。

* 定期バックアップ
* DBエクスポート
* 画像ストレージの永続化
* 障害時の復元手順

---

## 7.4 拡張性

以下を後から追加できる構造にする。

* 多言語
* 承認フロー
* Webhook
* 差分プレビュー
* AI編集
* サイト複製
* テンプレート販売
* 外部認証
* MCP対応

Webhookは、ある操作が起きたときに外部URLへ通知する仕組み。
例：CMSで公開したらVercelのビルドを自動実行する。

MCPは「Model Context Protocol」の略で、AIエージェントが外部ツールやデータに接続するための共通プロトコル。

---

## 8. データ設計案

## 8.1 主要テーブル

```txt
users
sites
site_members
api_keys
content_models       # DB上の名称。ドキュメント上は「コンテンツ種類」
contents
assets
webhooks
```

MVPでは以下は**作らない**（Phase 4以降または必要になった時点で追加）:

```txt
content_versions     # MVPは contents.status + updated_at / updated_by で足りる
content_fields       # MVPは content_models.schema_json に集約
```

---

## 8.2 sites

```txt
id
name
slug
created_at
updated_at
```

---

## 8.3 content_models（コンテンツ種類）

```txt
id
site_id
name
api_name
type
schema_json
created_at
updated_at
```

テーブル名は `content_models` のまま。アプリ・API・ドキュメントでは**コンテンツ種類**と呼ぶ。

`type` は以下。

```txt
single
collection
```

* `single`：トップページ、会社概要設定など1件だけのデータ
* `collection`：お知らせ、ブログ、FAQなど複数件のデータ

---

## 8.4 contents

```txt
id
site_id
model_id
slug
title
status
data_json
created_by
updated_by
published_at
created_at
updated_at
```

`data_json` に本文、セクション、SEO情報などを保存する。

MVPでは `status`（draft / published）で公開データを制御する。下書き編集中も公開APIは `published` のみ返す。Phase 2以降、必要に応じて公開時スナップショット（`published_data_json`）を検討する。

---

## 8.5 assets

```txt
id
site_id
url
filename
mime_type
size
width
height
alt
created_by
created_at
```

---

## 9. 管理画面要件

## 9.1 ダッシュボード

表示項目：

* サイト一覧
* 最近更新されたコンテンツ
* 公開中コンテンツ数
* 下書き数
* 画像使用量

---

## 9.2 コンテンツ一覧

機能：

* コンテンツ種類別一覧
* ステータス絞り込み
* キーワード検索
* 更新日順並び替え
* 新規作成
* 複製
* 削除

---

## 9.3 コンテンツ編集画面

機能：

* タイトル編集
* スラッグ編集
* 本文編集
* セクション編集
* SEO編集
* 下書き保存
* プレビュー
* 公開
* 非公開

---

## 9.4 セクション編集UI

機能：

* セクション追加
* セクション並び替え
* セクション開閉
* セクション複製
* セクション削除
* セクション非表示
* 型ごとのフォーム表示

UIイメージ：

```txt
[ Hero ]
  title
  lead
  image
  button

[ ImageText ]
  title
  body
  image
  imagePosition

[ FAQ ]
  items[]
    question
    answer
```

---

## 9.5 コンテンツ種類設計画面

管理画面GUIは**必須**。コンテンツ種類のスキーマ定義・編集UIを提供する。

### MVP

| 項目 | 方式 |
|------|------|
| スキーマ定義 | 開発者が `content-types/*.json` で定義 → デプロイ時にDB取り込み |
| 管理画面 | 取り込んだスキーマを**読み取り表示**し、コンテンツ編集フォームを生成 |
| GUIでの種類追加 | Phase 2 以降（MVPでは JSON 更新 + 再デプロイ） |

### Phase 2 以降の機能

* 種類名作成
* API名作成
* フィールド追加
* フィールド型選択
* 必須設定
* 並び替え

GUIなしでJSONだけ、という運用は**想定しない**。

---

## 10. 技術構成案

## 10.1 推奨構成

```txt
管理画面：
Next.js / React

API：
Next.js Route Handler
または Hono / Fastify / NestJS

DB：
PostgreSQL

認証：
Supabase Auth / Auth.js

画像：
Cloudflare R2 / Supabase Storage / S3互換ストレージ

デプロイ：
Vercel / Cloudflare / VPS
```

Honoは軽量なWebフレームワーク。
Fastifyは高速なNode.js向けWebフレームワーク。
NestJSは大規模開発向けのNode.jsフレームワーク。

---

## 10.2 個人的には最初のMVPはこの構成がよい

```txt
Next.js
PostgreSQL
Prisma
Supabase Auth
Cloudflare R2
Vercel
```

Prismaは、データベースをTypeScriptから扱いやすくするORM。
ORMは「Object Relational Mapping」の略で、直訳すると「オブジェクトとリレーショナルデータベースの対応付け」。SQLを直接書かずにDB操作しやすくする仕組み。

---

## 11. MVP範囲

最初に作るべき最小構成。

### 必須

* ログイン
* サイト作成
* コンテンツ種類定義（JSON取り込み + 管理画面表示）
* コンテンツ作成
* コンテンツ編集
* 下書き保存
* 公開・非公開
* REST API配信
* 画像アップロード
* セクション型データ
* プレビューAPI
* APIキー認証

### 後回し

* 多言語
* 承認フロー
* 高度な権限管理
* 複雑な差分管理
* Webhook
* MCP
* AIチャット編集UI
* サイト複製
* 使用量課金
* 請求管理

---

## 12. 優先順位

### Phase と MVP 必須の対応

| 機能 | MVP必須 | Phase |
|------|---------|-------|
| DB・ログイン・コンテンツ種類(JSON) | ○ | 1 |
| コンテンツCRUD・公開API・APIキー | ○ | 1 |
| セクション型UI・画像・SEO | ○ | 2 |
| プレビューAPI・プレビューリンク表示 | ○ | 2 |
| 権限管理（4ロール） | △簡易 | 3 |
| AIセクションAPI | — | 4 |

## Phase 1：CMSコア

目的：データを保存してAPIで取得できる状態にする。

* DB設計
* ログイン
* サイト作成
* コンテンツ種類定義（JSON取り込み + 管理画面表示）
* コンテンツCRUD
* APIキー
* 公開API

CRUDは「Create / Read / Update / Delete」の略。
作成、読み取り、更新、削除の基本操作。

---

## Phase 2：制作会社向け編集体験

目的：実案件で使える編集画面にする。

* セクション型UI
* 画像管理
* SEO編集
* プレビュー
* 並び替え
* 下書き・公開管理

---

## Phase 3：納品運用

目的：クライアントに渡せる状態にする。

* 権限管理
* バックアップ
* APIキーローテーション
* 操作ログ
* エクスポート
* 簡易ドキュメント

---

## Phase 4：AI編集対応

目的：AIエージェントが安全に編集できる状態にする。

* スキーマ取得API
* セクション単位更新API
* AI編集用下書き
* 差分確認
* MCP対応
* 自然言語編集UI

---

## 13. 重要な設計判断

## 13.1 CMSはページを描画しない

CMSはHTMLを出力しない。
CMSはJSONを返す。

これにより、以下の技術で自由に利用できる。

```txt
Next.js
Astro
Nuxt
SvelteKit
Laravel
Rails
WordPressテーマ
静的HTML生成
```

---

## 13.2 セクション型データは表示責任を持たない

CMSが持つのはこれ。

```json
{
  "type": "imageText",
  "data": {
    "title": "見出し",
    "body": "本文",
    "image": {},
    "imagePosition": "right"
  }
}
```

フロントエンド側が決めるのはこれ。

```txt
余白
色
レイアウト
アニメーション
レスポンシブ
コンポーネント実装
```

---

## 13.3 自由度を上げすぎない

CMSの自由度を上げすぎると、クライアントが壊せる範囲が広がる。

そのため、基本は以下。

```txt
制作者が構造を設計する
クライアントは安全な項目だけ編集する
AIもスキーマ内で編集する
```

---

## 13.4 スキーマ駆動にする

スキーマとは、データ構造の定義。

例：

```json
{
  "type": "hero",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "required": true
    },
    {
      "name": "lead",
      "type": "textarea"
    },
    {
      "name": "image",
      "type": "image"
    }
  ]
}
```

管理画面もAPIもAIも、このスキーマを基準に動く。

---

## 14. 成功条件

MVP段階の成功条件は以下。

```txt
1. 管理画面からページデータを作成できる
2. セクションを追加・並び替えできる
3. 画像を登録できる
4. 下書きと公開を分けられる
5. APIで公開データを取得できる
6. 同梱プレビューフロント（examples/preview）でページ表示できる
7. クライアントが最低限の更新を迷わずできる
8. 制作会社が案件ごとに再利用できる
```

---

## 15. このCMSの立ち位置

このCMSは、以下ではない。

```txt
WordPress代替
microCMS完全代替
ノーコードサイトビルダー
大規模SaaS
```

目指すべき立ち位置はこれ。

```txt
Web制作会社が案件ごとに使える
軽量なヘッドレスCMS基盤

人間にもAIにも扱いやすい
構造化コンテンツ管理システム
```

特に強みはここ。

```txt
制作会社がよく使うページ構造に最適化できる
フロントエンド技術を限定しない
API経由でどの技術スタックからも使える
AI編集を前提にデータ構造を設計できる
microCMSより低コストに運用提案しやすい
```

---

## 16. 最初に作るべきプロトタイプ

最初のプロトタイプは、以下だけでよい。

```txt
1サイト（1デプロイ）
1ユーザー
3コンテンツ種類
画像アップロード
ページ編集（管理画面GUI）
セクション編集
公開API
プレビューAPI + 管理画面のプレビューリンク
```

コンテンツ種類例：

```txt
topPage：トップページ
page：下層ページ
news：お知らせ
```

スキーマ定義は `content-types/topPage.json` 等の JSON ファイル。管理画面はこれに基づく編集GUIを必ず提供する。

この3種類が動けば、かなり実案件に近いデモになる。

特に重要なのは、以下の流れ。

```txt
CMSでトップページのheroを編集
↓
下書き保存
↓
管理画面のプレビューリンクを開く
↓
examples/preview が token 付きでAPI取得・表示
↓
公開
↓
公開APIから取得
↓
本番ページに反映
```

この流れを見せられれば、単なるCMS管理画面ではなく、**ヘッドレスCMSとして成立していること**を示せる。

---

## 17. プレビュー用フロント（同梱）

プロトタイプ検証用の最小フロントを**同一リポジトリ**に同梱する。

| 項目 | 方針 |
|------|------|
| 配置 | `examples/preview/` |
| 技術 | 静的HTMLを優先。API接続・プレビュートークン処理が楽なら Astro でも可 |
| 責務 | 配信API / プレビューAPI からJSON取得し、セクション型を簡易表示 |
| 本番 | クライアント案件のフロントは別実装。本ディレクトリはデモ・検証専用 |

CMS本体（`app/`）とは分離し、ヘッドレス原則（CMSは表示しない）を維持する。

### デモ用静的 HTML 自動エクスポート（最優先・計画）

プロトタイプ／`examples/preview` 向けに、管理画面でコンテンツを**保存・公開したタイミング**でデモ用静的 HTML を `examples/preview/` へ自動書き出す（詳細は実装時に確定）。

| 対象 | 方針 |
|------|------|
| **本番・案件納品** | 変更なし。配信は **JSON API のみ**。HTML / CSS は案件フロントの責務 |
| **同梱デモ** | 生成 HTML で編集直後の表示確認を完結。ランタイムの token 付き API 取得は検証用として併存可 |

本機能は CMS 本体が本番サイト用 HTML を配信する意味ではなく、**デモ・検証専用の副産物**である。
