import type { Translate } from "@/core/i18n/translate";

// Mirrors Supabase Auth: minimum_password_length = 8 and
// password_requirements = "letters_digits" in supabase/config.toml. Keep both
// in sync (hosted: Dashboard -> Authentication -> Providers -> Email).
// The server enforces the rules; this check only gives earlier feedback.
export const PASSWORD_MIN_LENGTH = 8;

export const passwordHint = (t: Translate) => t("Validation.passwordHint", { min: PASSWORD_MIN_LENGTH });

export function validatePassword(value: string, t: Translate) {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return t("Validation.passwordTooShort", { min: PASSWORD_MIN_LENGTH });
  }

  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return t("Validation.passwordLettersDigits");
  }

  return null;
}
