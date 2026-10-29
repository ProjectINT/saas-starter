import { serverEnv } from "@/core/config/server-env";
import { emailTranslator, savedLocale, sendEmail } from "@/core/email";
import { parseHookPayload, planAuthEmails, verifyWebhook, type SendEmailHookPayload } from "@/core/email/auth-hook";
import { authEmail } from "@/core/email/templates";
import { captureException, captureMessage } from "@/core/errors";
import { DEFAULT_LOCALE } from "@/core/i18n/config";
import { supportedLocale } from "@/core/i18n/negotiate";

/**
 * Supabase Auth's Send Email Hook: Auth posts every email it would send
 * (sign-up confirmation, password reset, email change...) and this route
 * sends it with the app's templates, in the user's language, through
 * EMAIL_PROVIDER. Configure it in supabase/config.toml ([auth.hook.send_email])
 * or Dashboard -> Authentication -> Hooks, with SEND_EMAIL_HOOK_SECRET.
 *
 * Auth shows the user an error unless this answers 200, so a failed send
 * fails the sign-up or reset rather than leaving the user waiting for an email.
 */
export async function POST(request: Request) {
  const secret = serverEnv.SEND_EMAIL_HOOK_SECRET;

  if (!secret) {
    return hookError(404, "The send-email hook is not configured");
  }

  const body = await request.text();
  const signed = verifyWebhook(body, {
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
  }, secret);

  if (!signed) {
    return hookError(401, "Invalid signature");
  }

  const payload = parseHookPayload(body);

  if (!payload) {
    return hookError(400, "Invalid payload");
  }

  const action = payload.email_data.email_action_type;
  const emails = planAuthEmails(payload);

  if (!emails) {
    // Not an email the app has a template for: answer 200 so the Auth action still succeeds.
    captureMessage("Auth email without a template", "warning", { action });

    return Response.json({});
  }

  try {
    const locale = await userLocale(payload.user);
    const t = await emailTranslator(locale);

    await Promise.all(emails.map((email) => sendEmail(authEmail(t, locale, email))));
  } catch (error) {
    captureException(error, { source: "send-email-hook", action });

    return hookError(500, "The email could not be sent");
  }

  return Response.json({});
}

/** The profile's language; at sign-up the profile may not be readable yet, so the one sent with the sign-up. */
async function userLocale(user: SendEmailHookPayload["user"]) {
  const saved = await savedLocale({ id: user.id }).catch((error: unknown) => {
    captureException(error, { source: "send-email-hook" });

    return null;
  });
  const metadataLocale = user.user_metadata?.locale;

  return saved ?? supportedLocale(typeof metadataLocale === "string" ? metadataLocale : null) ?? DEFAULT_LOCALE;
}

// Auth reads errors in this shape; every response must be JSON.
const hookError = (status: number, message: string) => Response.json({ error: { http_code: status, message } }, { status });
