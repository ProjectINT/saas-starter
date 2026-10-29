import type { ReactNode } from "react";

import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AdminNav } from "@/core/admin/components/admin-nav";
import { SignOutButton } from "@/core/auth/components/sign-out-button";
import { requireClaims } from "@/core/auth/session";
import { routes } from "@/core/config/routes";
import { LocaleSwitcher } from "@/core/i18n/components/locale-switcher";
import { createClient } from "@/core/supabase/server";
import { AppLink } from "@/core/ui/links";
import { BrandMark } from "@/core/ui/brand-logo";
import { ThemeSwitch } from "@/core/ui/theme-switch";

/**
 * Frame of the platform admin area. Platform admins only (asked of the
 * database); everyone else gets the same 404 as for a missing page. Every
 * admin RPC checks again.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const claims = await requireClaims();
  const supabase = await createClient();
  const { data: isAdmin, error } = await supabase.rpc("is_platform_admin");

  if (error) {
    throw error;
  }

  if (!isAdmin) {
    notFound();
  }

  const t = await getTranslations("Admin");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-separator bg-background">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <NextLink
            aria-label={t("title")}
            className="flex shrink-0 items-center gap-2"
            href={routes.admin}
          >
            <BrandMark className="size-7 text-accent" />
            <span className="font-semibold">{t("title")}</span>
          </NextLink>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <AppLink
              className="hidden text-sm sm:inline"
              href={routes.accounts}
            >
              {t("backToApp")}
            </AppLink>
            <span className="hidden truncate text-sm text-muted md:inline">{claims.email}</span>
            <LocaleSwitcher />
            <ThemeSwitch />
            <SignOutButton />
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
