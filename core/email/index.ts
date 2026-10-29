import "server-only";

import type { ComposedEmail } from "./templates";

import { getTranslations } from "next-intl/server";

import type { Translate } from "@/core/i18n/translate";
import { nodeEnv } from "@/core/config/public-env";
import { serverEnv } from "@/core/config/server-env";
import type { Locale } from "@/core/i18n/config";
import { supportedLocale } from "@/core/i18n/negotiate";
import { createAdminClient } from "@/core/supabase/admin";

import { consoleTransport, resendTransport, smtpTransport, type EmailTransport } from "./transports";

// Sending email from the server: invitations, welcome, and Supabase Auth's
// emails through the send-email hook. Templates are in ./templates, texts in
// the Emails namespace, the provider is EMAIL_PROVIDER.

let transport: EmailTransport | undefined;

function createTransport(): EmailTransport {
  // The env contract requires the provider's variables at start-up.
  switch (serverEnv.EMAIL_PROVIDER) {
    case "smtp":
      return smtpTransport({
        host: serverEnv.SMTP_HOST!,
        port: serverEnv.SMTP_PORT!,
        secure: serverEnv.SMTP_SECURE === "true",
        user: serverEnv.SMTP_USER,
        pass: serverEnv.SMTP_PASS,
      });
    case "resend":
      return resendTransport({ apiKey: serverEnv.RESEND_API_KEY! });
    case "console":
      return consoleTransport({ includeBody: nodeEnv !== "production" });
  }
}

/** Sends from EMAIL_FROM through EMAIL_PROVIDER. Throws if the provider does not accept the email. */
export async function sendEmail(email: ComposedEmail) {
  transport ??= createTransport();
  await transport.send({ from: serverEnv.EMAIL_FROM, ...email });
}

/** The root translator of a locale, for composing an email in the reader's language. */
export async function emailTranslator(locale: Locale): Promise<Translate> {
  return getTranslations({ locale });
}

/**
 * The language a user chose (profiles.locale), looked up by id or email; null
 * if none the app supports. Reads with the admin client: call it only after
 * the action that sends the email was authorized.
 */
export async function savedLocale(user: { id: string } | { email: string }): Promise<Locale | null> {
  const query = createAdminClient().from("profiles").select("locale");
  const { data, error } = await ("id" in user ? query.eq("id", user.id) : query.eq("email", user.email)).limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  return supportedLocale(data?.locale);
}
