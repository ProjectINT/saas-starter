import type { ReactNode } from "react";

import NextLink from "next/link";
import { getTranslations } from "next-intl/server";

import { routes } from "@/core/config/routes";
import { siteConfig } from "@/core/config/site";
import { LocaleSwitcher } from "@/core/i18n/components/locale-switcher";
import { BrandLogo, BrandMark } from "@/core/ui/brand-logo";
import { ThemeSwitch } from "@/core/ui/theme-switch";

/**
 * Frame for pages outside an account: sign-in and sign-up, password reset,
 * account selection and onboarding. Form column on the left, brand panel on
 * the right (large screens only).
 */
export function AuthShell({ children, headerEnd }: { children: ReactNode; headerEnd?: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full">
      <div className="flex w-full flex-col lg:w-1/2">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
          <NextLink
            aria-label={siteConfig.name}
            href={routes.home}
          >
            <BrandLogo />
          </NextLink>
          <div className="flex min-w-0 items-center gap-2">
            {headerEnd}
            <LocaleSwitcher />
            <ThemeSwitch />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="flex w-full max-w-sm flex-col gap-6">{children}</div>
        </main>
      </div>
      <AuthAside />
    </div>
  );
}

/** Brand panel. Replace with the product's own visual (screenshot, testimonial). */
async function AuthAside() {
  const t = await getTranslations("Site");

  return (
    <aside className="relative hidden w-1/2 overflow-hidden bg-accent text-accent-foreground lg:flex lg:flex-col lg:justify-end lg:p-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.25),transparent_50%)]"
      />
      <div className="relative flex flex-col gap-4">
        <BrandMark className="size-12 text-white/20" />
        <p className="text-3xl font-semibold leading-tight">{t("tagline")}</p>
        <p className="text-accent-foreground/70">{t("description")}</p>
      </div>
    </aside>
  );
}
