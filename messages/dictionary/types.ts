/**
 * One UI text. `word` is the English source in ICU message syntax
 * (https://next-intl.dev/docs/usage/messages): `{name}` arguments,
 * `{count, plural, one {...} other {...}}`, `<link>...</link>` tags for rich
 * text. The translation script keeps arguments and tags as they are.
 */
export interface DictionaryEntry {
  word: string;
  /** Guidance for the translator: tone, length, terms to keep. */
  tip?: string;
  /** Where the text appears. */
  context?: string;
}

/** A namespace or a group of keys. A key named `word` is reserved for entries. */
export interface DictionarySection {
  [key: string]: DictionaryEntry | DictionarySection;
}
