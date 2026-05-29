const RICH_TEXT_PURIFY_OPTIONS = {
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

type DomPurifyModule = typeof import("isomorphic-dompurify");

let domPurifyPromise: Promise<DomPurifyModule["default"]> | null = null;

async function loadDomPurify(): Promise<DomPurifyModule["default"]> {
  if (!domPurifyPromise) {
    domPurifyPromise = import("isomorphic-dompurify").then((module) => module.default);
  }

  return domPurifyPromise;
}

export async function sanitizeRichTextHtml(value: string): Promise<string> {
  if (value.trim().length === 0) {
    return "";
  }

  const DOMPurify = await loadDomPurify();
  return DOMPurify.sanitize(value, RICH_TEXT_PURIFY_OPTIONS);
}
