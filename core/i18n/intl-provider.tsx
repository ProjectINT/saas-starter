"use client";

import type { ReactNode } from "react";

import { NextIntlClientProvider, type AbstractIntlMessages, type Locale } from "next-intl";

import { TIME_ZONE } from "./config";
import { messageFallback, reportIntlError } from "./report";

/**
 * Messages for Client Components. A client wrapper because functions
 * (onError, getMessageFallback) cannot be passed from the server layout.
 */
export function IntlProvider({ locale, messages, children }: { locale: Locale; messages: AbstractIntlMessages; children: ReactNode }) {
  return (
    <NextIntlClientProvider
      getMessageFallback={messageFallback}
      locale={locale}
      messages={messages}
      timeZone={TIME_ZONE}
      onError={reportIntlError}
    >
      {children}
    </NextIntlClientProvider>
  );
}
