import type { Messages } from "next-intl";

import type { Translate } from "@/core/i18n/translate";
import { captureException } from "@/core/errors";
import { PASSWORD_MIN_LENGTH } from "@/core/validation/password";

type AuthErrorKey = keyof Messages["Auth"]["errors"];

/**
 * Supabase Auth error codes with a message of their own in Auth.errors
 * (https://supabase.com/docs/guides/auth/debugging/error-codes). Other codes
 * get a generic message: server texts are never shown.
 */
const CODES = [
  "invalid_credentials",
  "email_not_confirmed",
  "user_already_exists",
  "weak_password",
  "same_password",
  "email_address_invalid",
  "signup_disabled",
  "user_banned",
  "captcha_failed",
  "over_request_rate_limit",
  "over_email_send_rate_limit",
  "session_expired",
  "reauthentication_needed",
] as const satisfies readonly AuthErrorKey[];

const ALIASES: Record<string, AuthErrorKey> = {
  email_exists: "user_already_exists",
  session_not_found: "session_expired",
  // The send-email hook (app/api/auth/send-email) did not answer in time.
  hook_timeout: "email_send_failed",
  hook_timeout_after_retry: "email_send_failed",
};

/** Shown to the user, but still a fault of ours: reported like unknown errors. */
const REPORTED: readonly AuthErrorKey[] = ["unknown", "email_send_failed"];

const isCode = (code: string): code is (typeof CODES)[number] => (CODES as readonly string[]).includes(code);

interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
}

export function authErrorKey(error: AuthErrorLike): AuthErrorKey {
  if (error.code && (isCode(error.code) || Object.hasOwn(ALIASES, error.code))) {
    return isCode(error.code) ? error.code : ALIASES[error.code];
  }

  if (error.status === 429) {
    return "over_request_rate_limit";
  }

  // supabase-js reports fetch failures as AuthRetryableFetchError (status 0).
  if (error.name === "AuthRetryableFetchError") {
    return "network";
  }

  return "unknown";
}

/** The text for a Supabase Auth error. Unknown errors are reported and get a generic text. */
export function authErrorMessage(error: AuthErrorLike, t: Translate) {
  const key = authErrorKey(error);

  if (REPORTED.includes(key)) {
    captureException(error, { source: "auth" });
  }

  return t(`Auth.errors.${key}`, { min: PASSWORD_MIN_LENGTH });
}
