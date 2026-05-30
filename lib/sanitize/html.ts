import sanitizeHtml from "sanitize-html";

const RICH_TEXT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "code",
    "pre",
    "span",
    "div",
    "sub",
    "sup",
    "hr",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    span: ["class"],
  },
  // インライン装飾用の安全なクラスのみ許可（エディタの「アクセント」ボタン相当）。
  // フロント側で .accent / .highlight / .muted に対応する見た目を定義する想定。
  allowedClasses: {
    span: ["accent", "highlight", "muted"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowProtocolRelative: false,
};

export async function sanitizeRichTextHtml(value: string): Promise<string> {
  if (value.trim().length === 0) {
    return "";
  }

  return sanitizeHtml(value, RICH_TEXT_SANITIZE_OPTIONS);
}
