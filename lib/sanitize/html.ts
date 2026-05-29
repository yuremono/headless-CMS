import DOMPurify from "isomorphic-dompurify";

const RICH_TEXT_PURIFY_OPTIONS: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
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
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "width", "height"],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeRichTextHtml(value: string): string {
  if (value.trim().length === 0) {
    return "";
  }

  return DOMPurify.sanitize(value, RICH_TEXT_PURIFY_OPTIONS);
}
