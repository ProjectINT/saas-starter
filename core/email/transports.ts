import { createTransport } from "nodemailer";

/** A rendered email with its sender, ready for a provider. */
export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  /** Resolves once the provider accepted the email; throws otherwise. */
  send(email: OutgoingEmail): Promise<void>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  /** TLS from the start (port 465). Otherwise STARTTLS is used when the server offers it. */
  secure: boolean;
  user?: string;
  pass?: string;
}

/** Any SMTP server; locally the Mailpit of the Supabase stack. */
export function smtpTransport({ host, port, secure, user, pass }: SmtpConfig): EmailTransport {
  const transporter = createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  return {
    async send(email) {
      await transporter.sendMail(email);
    },
  };
}

const RESEND_URL = "https://api.resend.com/emails";

/** Resend's HTTP API (no SDK needed). */
export function resendTransport({ apiKey, fetch = globalThis.fetch }: { apiKey: string; fetch?: typeof globalThis.fetch }): EmailTransport {
  return {
    async send({ from, to, subject, html, text }) {
      const response = await fetch(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });

      if (!response.ok) {
        // Resend explains the problem in the body (unverified domain, bad address); it holds no secrets.
        const detail = (await response.text().catch(() => "")).slice(0, 300);

        throw new Error(`Resend answered ${response.status}: ${detail}`);
      }
    },
  };
}

/**
 * Prints emails instead of sending them. The body (with its one-time links)
 * only where logs are private to the developer.
 */
export function consoleTransport({ includeBody }: { includeBody: boolean }): EmailTransport {
  return {
    async send({ to, subject, text }) {
      // eslint-disable-next-line no-console -- printing is this transport's job
      console.info(`[email] to ${to}: ${subject}${includeBody ? `\n${text}` : ""}`);
    },
  };
}
