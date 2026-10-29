// Mirrors the name check of public.accounts in supabase/schemas/21_accounts.sql:
// 1-100 characters after trimming (create_account trims the name too).

export const ACCOUNT_NAME_MAX_LENGTH = 100;

export function validateAccountName(value: string) {
  const length = [...value.trim()].length;

  if (length === 0) {
    return "Enter the account name.";
  }

  if (length > ACCOUNT_NAME_MAX_LENGTH) {
    return `Use at most ${ACCOUNT_NAME_MAX_LENGTH} characters.`;
  }

  return null;
}
