import type { ReactNode } from "react";

import NextLink from "next/link";

import { routes } from "@/core/config/routes";
import { LocaleSwitcher } from "@/core/i18n/components/locale-switcher";
import { BrandLogo } from "@/core/ui/brand-logo";
import { ThemeSwitch } from "@/core/ui/theme-switch";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <NextLink href={routes.home}>
          <BrandLogo />
        </NextLink>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeSwitch />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold">
        {children}
      </main>
    </div>
  );
}
