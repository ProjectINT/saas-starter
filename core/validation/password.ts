// Mirrors Supabase Auth: minimum_password_length = 8 and
// password_requirements = "letters_digits" in supabase/config.toml. Keep both
// in sync (hosted: Dashboard -> Authentication -> Providers -> Email).
// The server enforces the rules; this check only gives earlier feedback.

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT = `Use at least ${PASSWORD_MIN_LENGTH} characters with letters and digits.`;

export function validatePassword(value: string) {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "Use both letters and digits.";
  }

  return null;
}
