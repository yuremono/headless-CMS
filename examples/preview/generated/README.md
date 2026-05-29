# Generated static HTML

CMS の静的エクスポート（`lib/static-export`）がここに HTML を出力します。

## ディレクトリ

| パス | 内容 |
|------|------|
| `draft/{contentType}/*.html` | 下書き含む最新本文（管理プレビュー相当） |
| `published/{contentType}/*.html` | 公開済みのみ（配信 API と同条件） |

親の `examples/preview/css/preview.css` を相対参照します。`published/` だけをコピーする場合は `css/` もセットで配布してください。

## 閲覧例

```bash
cd examples/preview/generated/published && python3 -m http.server 3001
# → http://localhost:3001/page/about.html
```

`draft/` はポート 3002 など別ポートで同様に起動できます。
