import { describe, expect, it } from "vitest";
import { sanitizeRichTextHtml } from "./html";

describe("sanitizeRichTextHtml", () => {
  it("空文字列は空文字列を返す", () => {
    expect(sanitizeRichTextHtml("   ")).toBe("");
  });

  it("許可されたタグは保持する", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeRichTextHtml(input)).toBe(input);
  });

  it("script タグを除去する", () => {
    const input = '<p>Safe</p><script>alert("xss")</script>';
    expect(sanitizeRichTextHtml(input)).toBe("<p>Safe</p>");
  });

  it("onclick 属性を除去する", () => {
    const input = '<a href="https://example.com" onclick="alert(1)">link</a>';
    const result = sanitizeRichTextHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain('href="https://example.com"');
  });

  it("許可された img 属性は保持する", () => {
    const input = '<img src="/images/a.png" alt="A" width="100" height="50" />';
    expect(sanitizeRichTextHtml(input)).toContain('src="/images/a.png"');
    expect(sanitizeRichTextHtml(input)).toContain('alt="A"');
  });
});
