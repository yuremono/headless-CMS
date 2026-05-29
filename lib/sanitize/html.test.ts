import { describe, expect, it } from "vitest";
import { sanitizeRichTextHtml } from "./html";

describe("sanitizeRichTextHtml", () => {
  it("空文字列は空文字列を返す", async () => {
    await expect(sanitizeRichTextHtml("   ")).resolves.toBe("");
  });

  it("許可されたタグは保持する", async () => {
    const input = "<p>Hello <strong>world</strong></p>";
    await expect(sanitizeRichTextHtml(input)).resolves.toBe(input);
  });

  it("script タグを除去する", async () => {
    const input = '<p>Safe</p><script>alert("xss")</script>';
    await expect(sanitizeRichTextHtml(input)).resolves.toBe("<p>Safe</p>");
  });

  it("onclick 属性を除去する", async () => {
    const input = '<a href="https://example.com" onclick="alert(1)">link</a>';
    const result = await sanitizeRichTextHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain('href="https://example.com"');
  });

  it("許可された img 属性は保持する", async () => {
    const input = '<img src="/images/a.png" alt="A" width="100" height="50" />';
    const result = await sanitizeRichTextHtml(input);
    expect(result).toContain('src="/images/a.png"');
    expect(result).toContain('alt="A"');
  });
});
