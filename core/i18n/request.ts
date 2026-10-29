import { getRequestConfig } from "next-intl/server";

import { requestLocale, requestTimeZone } from "./locale";
import { loadMessages } from "./messages";
import { messageFallback, reportIntlError } from "./report";
import { supportedLocale } from "./negotiate";

/**
 * next-intl request config (registered in next.config.ts). A locale passed
 * explicitly, as in `getTranslations({ locale: recipientLocale })` for an
 * email, wins over the request's own: the reader's language, not the sender's.
 */
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const locale = supportedLocale(explicitLocale) ?? (await requestLocale());

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: await requestTimeZone(),
    onError: reportIntlError,
    getMessageFallback: messageFallback,
  };
});
