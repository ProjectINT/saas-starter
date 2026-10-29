import "server-only";

import { after } from "next/server";

import { routes } from "@/core/config/routes";
import { absoluteUrl } from "@/core/config/site-url";
import { captureException } from "@/core/errors";
import { DEFAULT_LOCALE } from "@/core/i18n/config";
import { supportedLocale } from "@/core/i18n/negotiate";
import { createAdminClient } from "@/core/supabase/admin";

import { welcomeEmail } from "./templates";

import { emailTranslator, sendEmail } from "./index";

/**
 * Sends the welcome email once per user (profiles.welcome_email_sent_at),
 * after the response so the redirect is not held up. Call it where a session
 * starts from a confirmed email or an OAuth sign-in: /auth/confirm, /auth/callback.
 */
export function sendWelcomeEmailOnce(userId: string) {
  after(async () => {
    try {
      // Claiming the row first makes concurrent sign-ins send one email.
      const { data, error } = await createAdminClient()
        .from("profiles")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("id", userId)
        .is("welcome_email_sent_at", null)
        .select("email, locale")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data?.email) {
        return;
      }

      const locale = supportedLocale(data.locale) ?? DEFAULT_LOCALE;

      await sendEmail(welcomeEmail(await emailTranslator(locale), locale, { to: data.email, url: absoluteUrl(routes.accounts) }));
    } catch (error) {
      captureException(error, { action: "welcomeEmail" });
    }
  });
}
