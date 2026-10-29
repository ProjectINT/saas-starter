import { describe, expect, it } from "vitest";

import { escapeHtml, renderEmail, type EmailContent } from "./render";

const chrome = { lang: "en", siteName: "Acme", linkFallback: "Or open:", footer: "Sent to bob@example.com." };

const content: EmailContent = {
  subject: "Join <Team>\nnow",
  heading: "Join \"Team\" & co",
  paragraphs: ["<script>alert(1)</script> invited you."],
  action: { label: "Accept", url: "https://app.example.com/invite/abc?x=1&y=2" },
  notes: ["Valid for 7 days."],
};

describe("renderEmail", () => {
  it("escapes every text in the HTML part", () => {
    const { html } = renderEmail(content, chrome);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; invited you.");
    expect(html).toContain("Join &quot;Team&quot; &amp; co");
    expect(html).toContain("href=\"https://app.example.com/invite/abc?x=1&amp;y=2\"");
    expect(html).toContain("<html lang=\"en\">");
  });

  it("writes a plain-text part with the URL spelled out", () => {
    const { text } = renderEmail(content, chrome);

    expect(text).toContain("<script>alert(1)</script> invited you.");
    expect(text).toContain("Accept: https://app.example.com/invite/abc?x=1&y=2");
    expect(text.trimEnd().endsWith("Sent to bob@example.com.")).toBe(true);
  });

  it("keeps the subject on one line", () => {
    expect(renderEmail(content, chrome).subject).toBe("Join <Team> now");
  });

  it("refuses links that are not http(s)", () => {
    expect(() => renderEmail({ ...content, action: { label: "x", url: "javascript:alert(1)" } }, chrome)).toThrow(/http/);
  });

  it("shows a code without a button", () => {
    const { html, text } = renderEmail({ ...content, action: undefined, code: "123456" }, chrome);

    expect(html).toContain("123456");
    expect(html).not.toContain("<a href");
    expect(text).toContain("123456");
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml("<a href=\"x\">'&'</a>")).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
