/**
 * What an email says, as plain text. renderEmail() escapes every string for
 * the HTML part, so names and other user input can go in as they are.
 */
export interface EmailContent {
  subject: string;
  /** Summary that mail clients show next to the subject; the first paragraph by default. */
  preview?: string;
  heading: string;
  paragraphs: string[];
  /** The one button of the email. Its URL is also printed for clients that block buttons. */
  action?: { label: string; url: string };
  /** A one-time code shown large, for codes typed into the app. */
  code?: string;
  /** Small print: how long a link works, what to do if the email was not expected. */
  notes: string[];
}

/** Texts every email shares, in the recipient's language. */
export interface EmailChrome {
  /** BCP 47 tag for <html lang>. */
  lang: string;
  siteName: string;
  /** Introduces the plain URL under the button. */
  linkFallback: string;
  footer: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** Subjects are a single header line: no line breaks, collapsed spaces. */
export const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

function assertWebUrl(url: string) {
  const { protocol } = new URL(url);

  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error(`Email links must be http(s), got ${protocol}`);
  }
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const row = (style: string, html: string) => `<tr><td style="${style}">${html}</td></tr>`;

function renderHtml(content: EmailContent, chrome: EmailChrome) {
  const e = escapeHtml;
  const rows = [
    row("font-size:14px;font-weight:600;color:#52525b;padding-bottom:24px;", e(chrome.siteName)),
    row("font-size:22px;font-weight:600;line-height:1.3;padding-bottom:16px;", e(content.heading)),
    ...content.paragraphs.map((paragraph) => row("font-size:16px;line-height:1.5;padding-bottom:16px;", e(paragraph))),
  ];

  if (content.code) {
    rows.push(row("font-size:28px;font-weight:600;letter-spacing:6px;padding:8px 0 24px;", e(content.code)));
  }

  if (content.action) {
    const url = e(content.action.url);

    rows.push(
      row(
        "padding:8px 0 24px;",
        `<a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;line-height:1;padding:14px 20px;border-radius:8px;">${e(content.action.label)}</a>`
      ),
      row(
        "font-size:13px;line-height:1.5;color:#71717a;padding-bottom:16px;",
        `${e(chrome.linkFallback)}<br><a href="${url}" style="color:#52525b;word-break:break-all;">${url}</a>`
      )
    );
  }

  rows.push(...content.notes.map((note) => row("font-size:13px;line-height:1.5;color:#71717a;padding-bottom:8px;", e(note))));

  return [
    "<!doctype html>",
    `<html lang="${e(chrome.lang)}">`,
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<meta name=\"color-scheme\" content=\"light\">",
    `<title>${e(oneLine(content.subject))}</title>`,
    "</head>",
    "<body style=\"margin:0;padding:0;background:#f4f4f5;\">",
    `<div style="display:none;max-height:0;overflow:hidden;">${e(content.preview ?? content.paragraphs[0] ?? "")}</div>`,
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f4f4f5;padding:24px 12px;\"><tr><td align=\"center\">",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;font-family:${FONT};color:#18181b;">`,
    ...rows,
    "</table>",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;font-family:${FONT};">`,
    row("font-size:12px;line-height:1.5;color:#a1a1aa;padding:16px 32px;", e(chrome.footer)),
    "</table>",
    "</td></tr></table>",
    "</body>",
    "</html>",
  ].join("\n");
}

function renderText(content: EmailContent, chrome: EmailChrome) {
  const blocks = [content.heading, ...content.paragraphs];

  if (content.code) {
    blocks.push(content.code);
  }

  if (content.action) {
    blocks.push(`${content.action.label}: ${content.action.url}`);
  }

  blocks.push(...content.notes, `-- \n${chrome.footer}`);

  return `${blocks.join("\n\n")}\n`;
}

/** The HTML and plain-text parts of an email. */
export function renderEmail(content: EmailContent, chrome: EmailChrome): RenderedEmail {
  if (content.action) {
    assertWebUrl(content.action.url);
  }

  return {
    subject: oneLine(content.subject),
    html: renderHtml(content, chrome),
    text: renderText(content, chrome),
  };
}
