import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./config";

/**
 * Picks the best supported locale from an Accept-Language header:
 * "ru-RU,ru;q=0.9,en;q=0.8" -> "ru". Exact tags win over base languages
 * of the same weight; q=0 means "not this one".
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  const ranges = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;

      return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0, index };
    })
    .filter(({ tag, weight }) => tag && weight > 0)
    .toSorted((a, b) => b.weight - a.weight || a.index - b.index);

  for (const { tag } of ranges) {
    if (tag === "*") {
      return DEFAULT_LOCALE;
    }

    const base = tag.split("-")[0];
    const match = LOCALES.find((locale) => locale === tag) ?? LOCALES.find((locale) => locale === base);

    if (match) {
      return match;
    }
  }

  return DEFAULT_LOCALE;
}

/** A stored locale (cookie, profile) if the app still supports it. "pt-BR" -> null unless listed. */
export function supportedLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }

  const tag = value.toLowerCase();

  return isLocale(tag) ? tag : null;
}
