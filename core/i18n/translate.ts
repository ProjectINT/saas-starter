import type { MessageKeys, Messages, NestedKeyOf, TranslationValues } from "next-intl";

/** Any message key, from the root: "Validation.emailInvalid". */
export type MessageKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

/**
 * What helpers outside components (validators, error mappers, palistor store
 * callbacks) take to produce text: the root translator from
 * `useTranslations()` / `getTranslations()`, or palistor's `t`.
 */
export type Translate = (key: MessageKey, values?: TranslationValues) => string;
