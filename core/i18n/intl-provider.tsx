"use client";

import type { ReactNode } from "react";

import { NextIntlClientProvider, type AbstractIntlMessages, type Locale } from "next-intl";

import { messageFallback, reportIntlError } from "./report";

/**
 * Messages for Client Components. A client wrapper because functions
 * (onError, getMessageFallback) cannot be passed from the server layout.
 */
export function IntlProvider({ locale, timeZone, messages, children }: {
  locale: Locale;
  /** The request's zone (getTimeZone()), so the browser formats dates like the server. */
  timeZone: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      getMessageFallback={messageFallback}
      locale={locale}
      messages={messages}
      timeZone={timeZone}
      onError={reportIntlError}
    >
      {children}
    </NextIntlClientProvider>
  );
}
