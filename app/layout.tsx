import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getLocale, getMessages, getTimeZone, getTranslations } from "next-intl/server";

import { siteConfig } from "@/core/config/site";
import { IntlProvider } from "@/core/i18n/intl-provider";
import { clientMessages } from "@/core/i18n/messages";
import { Providers } from "@/core/ui/providers";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Site");

  return {
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, timeZone, messages] = await Promise.all([getLocale(), getTimeZone(), getMessages()]);

  return (
    // next-themes sets the theme class on <html> before hydration.
    <html
      suppressHydrationWarning
      lang={locale}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <IntlProvider
          locale={locale}
          messages={clientMessages(messages)}
          timeZone={timeZone}
        >
          <Providers>{children}</Providers>
        </IntlProvider>
      </body>
    </html>
  );
}
