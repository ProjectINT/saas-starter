import type { Translate } from "@/core/i18n/translate";

// Mirrors the name check of public.accounts in supabase/schemas/21_accounts.sql:
// 1-100 characters after trimming (create_account trims the name too).
export const ACCOUNT_NAME_MAX_LENGTH = 100;

export function validateAccountName(value: string, t: Translate) {
  const length = [...value.trim()].length;

  if (length === 0) {
    return t("Validation.accountNameRequired");
  }

  if (length > ACCOUNT_NAME_MAX_LENGTH) {
    return t("Validation.textTooLong", { max: ACCOUNT_NAME_MAX_LENGTH });
  }

  return null;
}
