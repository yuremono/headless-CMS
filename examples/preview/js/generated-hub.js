const MANIFEST_URL = "./generated/manifest.json";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {{ pages?: Array<{ label?: string; href: string }>; generatedAt?: string }} manifest
 */
function renderPageList(manifest) {
  const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
  if (pages.length === 0) {
    return `<p class="preview_generated__empty">
      まだエクスポートされた HTML がありません。CMS でコンテンツを保存すると
      <code>generated/</code> に HTML が出力されます（<code>lib/static-export</code>）。
    </p>`;
  }

  const items = pages
    .map((page) => {
      const href = page.href.startsWith("./") ? page.href : `./generated/${page.href.replace(/^\//, "")}`;
      const label = page.label ?? page.href;
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`;
    })
    .join("");

  const generatedAt =
    typeof manifest.generatedAt === "string"
      ? `<p class="preview_generated__meta">最終エクスポート: ${escapeHtml(manifest.generatedAt)}</p>`
      : "";

  return `${generatedAt}<ul class="preview_generated__list">${items}</ul>`;
}

export async function renderGeneratedHub() {
  let manifest = { pages: [] };

  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (response.ok) {
      manifest = await response.json();
    }
  } catch {
    /* file:// や未エクスポート時は manifest なしで案内のみ */
  }

  return `
    <section class="preview_generated" aria-labelledby="preview_generated_title">
      <h1 id="preview_generated_title">静的 HTML プレビュー</h1>
      <p>
        CMS がエクスポートした HTML は <code>generated/</code> にあります。
        <strong>サーバー不要</strong>でブラウザから直接開けます。
      </p>
      <ol class="preview_generated__steps">
        <li>管理画面でコンテンツを編集・保存（自動再エクスポート）</li>
        <li><code>generated/*.html</code> をダブルクリック、または下のリンクから開く</li>
        <li>フォルダごと配布する場合は <code>generated/</code> をコピーするだけ</li>
      </ol>
      ${renderPageList(manifest)}
      <details class="preview_generated__api">
        <summary>下書き API プレビュー（開発用）</summary>
        <p>
          リアルタイム下書きは CMS 配信 API 経由です。
          <a href="./">API プレビューモード</a> を使うか、
          <code>python3 -m http.server 3001</code> でこのディレクトリを配信し、
          クエリ付き URL（<code>?siteId=…&amp;previewToken=…</code>）を開いてください。
        </p>
      </details>
    </section>
  `;
}
