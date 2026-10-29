// The only list of UI languages. The database stores a profile's locale as a
// BCP 47 tag (format check only), the dictionary script translates into these,
// and the switcher offers them. Adding a language: add it here, then run
// `npm run i18n:translate`.
//
// No path aliases in this file: scripts/i18n.ts imports it with plain Node.

export const LOCALES = ["en", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

/** Source language of the dictionaries, and the fallback for missing translations. */
export const DEFAULT_LOCALE: Locale = "en";

/** Names in their own language, so a user can find theirs whatever the UI language is. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
};

/** Set by the language switcher (and from the profile at sign-in); read on every request. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Time zone for formatting dates when the user has not chosen one. The
 * request's zone (TIME_ZONE_COOKIE, from profiles.timezone) is used on the
 * server and in the browser alike, so both render the same text.
 */
export const DEFAULT_TIME_ZONE = "UTC";

/** Set from the preferences page (and from the profile at sign-in); read on every request. */
export const TIME_ZONE_COOKIE = "NEXT_TIMEZONE";

/** An IANA zone name the runtime knows ("Europe/Berlin"); also accepts "UTC". */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value === "" || value.length > 64) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: value });

    return true;
  } catch {
    return false;
  }
}

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);
