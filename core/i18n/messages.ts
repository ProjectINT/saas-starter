import "server-only";

import type { Messages } from "next-intl";

import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Namespaces read only on the server (page titles, legal texts). The root
 * layout leaves them out of the messages sent to the browser.
 */
export const SERVER_NAMESPACES = ["Metadata", "Legal"] as const satisfies (keyof Messages)[];

type MessageTree = { [key: string]: string | MessageTree };

function mergeMessages(base: MessageTree, override: MessageTree): MessageTree {
  const result: MessageTree = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const current = result[key];

    result[key] = typeof value === "object" && typeof current === "object" ? mergeMessages(current, value) : value;
  }

  return result;
}

/**
 * Messages of a locale over the English ones, so a key missing from a
 * translation shows English rather than its key (`npm run i18n:check` keeps
 * the files complete; this only covers the gap until they are).
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const english = (await import("../../messages/en.json")).default;

  if (locale === DEFAULT_LOCALE) {
    return english;
  }

  const translated = (await import(`../../messages/${locale}.json`)).default as MessageTree;

  return mergeMessages(english, translated) as Messages;
}

/** The messages the browser needs: everything except SERVER_NAMESPACES. */
export function clientMessages(messages: Messages) {
  const result: Partial<Messages> = { ...messages };

  for (const namespace of SERVER_NAMESPACES) {
    delete result[namespace];
  }

  return result;
}
