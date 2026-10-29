import { PASSWORD_HINT } from "@/core/validation/password";

/**
 * User-facing messages for Supabase Auth error codes
 * (https://supabase.com/docs/guides/auth/debugging/error-codes).
 * Keyed by code so the i18n phase can swap the strings for translations.
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  email_not_confirmed: "Confirm your email address first.",
  user_already_exists: "An account with this email already exists.",
  email_exists: "An account with this email already exists.",
  weak_password: `This password is too weak. ${PASSWORD_HINT}`,
  same_password: "The new password must be different from the current one.",
  email_address_invalid: "This email address cannot be used.",
  signup_disabled: "Sign-ups are currently disabled.",
  user_banned: "This account is blocked. Contact support.",
  captcha_failed: "The captcha check failed. Try again.",
  over_request_rate_limit: "Too many attempts. Wait a few minutes and try again.",
  over_email_send_rate_limit: "Too many emails sent. Wait a few minutes and try again.",
  session_expired: "Your session has expired. Sign in again.",
  session_not_found: "Your session has expired. Sign in again.",
  reauthentication_needed: "Sign in again to change your password.",
};

const NETWORK_ERROR = "Cannot reach the server. Check your connection and try again.";
const UNKNOWN_ERROR = "Something went wrong. Try again.";

interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
}

export function authErrorMessage(error: AuthErrorLike) {
  if (error.code && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }

  if (error.status === 429) {
    return MESSAGES.over_request_rate_limit;
  }

  // supabase-js reports fetch failures as AuthRetryableFetchError (status 0).
  if (error.name === "AuthRetryableFetchError") {
    return NETWORK_ERROR;
  }

  return UNKNOWN_ERROR;
}
