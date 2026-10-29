import type { Translate } from "@/core/i18n/translate";

// Mirrors the accounts_slug_format check in supabase/schemas/21_accounts.sql:
// 3-48 chars, lowercase letters, digits and inner hyphens. Reserved slugs and
// uniqueness are checked by the database only.
export const SLUG_MIN_LENGTH = 3;

export const SLUG_MAX_LENGTH = 48;

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

export const slugHint = (t: Translate) => t("Validation.slugHint", { min: SLUG_MIN_LENGTH, max: SLUG_MAX_LENGTH });

/** True if the value could be an account slug; for routing, where no message is shown. */
export const isValidSlug = (value: string) => SLUG_PATTERN.test(value);

export function validateSlug(value: string, t: Translate) {
  if (value.length < SLUG_MIN_LENGTH) {
    return t("Validation.slugTooShort", { min: SLUG_MIN_LENGTH });
  }

  if (value.length > SLUG_MAX_LENGTH) {
    return t("Validation.textTooLong", { max: SLUG_MAX_LENGTH });
  }

  if (!isValidSlug(value)) {
    return t("Validation.slugFormat");
  }

  return null;
}

// Russian is one of the template's default languages, so Cyrillic names get a
// readable slug instead of an empty one.
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Suggests a slug for a name: "Acme Café" -> "acme-cafe", "Ромашка" -> "romashka". */
export function slugify(value: string) {
  return [...value.toLowerCase()]
    .map((char) => CYRILLIC[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
}
