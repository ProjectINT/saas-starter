import type { Translate } from "@/core/i18n/translate";

// Mirrors the account_invitations_email_format check in
// supabase/schemas/23_account_invitations.sql, applied after the trimming and
// lowercasing that create_invitation does.
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The email as create_invitation stores it. */
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export function validateEmail(value: string, t: Translate) {
  const email = normalizeEmail(value);

  if (!email) {
    return t("Validation.emailRequired");
  }

  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return t("Validation.emailInvalid");
  }

  return null;
}
