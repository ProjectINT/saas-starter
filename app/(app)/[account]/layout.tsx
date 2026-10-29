import type { ReactNode } from "react";

import NextLink from "next/link";
import { notFound } from "next/navigation";

import { SignOutButton } from "@/core/auth/components/sign-out-button";
import { requireClaims } from "@/core/auth/session";
import { accountPath } from "@/core/config/routes";
import { LocaleSwitcher } from "@/core/i18n/components/locale-switcher";
import { getAccountContext, listMyAccounts } from "@/core/tenancy/accounts";
import { AccountNav } from "@/core/tenancy/components/account-nav";
import { AccountProvider } from "@/core/tenancy/components/account-provider";
import { AccountSwitcher } from "@/core/tenancy/components/account-switcher";
import { BrandMark } from "@/core/ui/brand-logo";
import { ThemeSwitch } from "@/core/ui/theme-switch";
import { isValidSlug } from "@/core/validation/slug";

type Props = { children: ReactNode; params: Promise<{ account: string }> };

/**
 * Frame of every tenant page. Resolves the account from the slug for members
 * only (others get a 404, the same as for a missing account) and hands it to
 * client components through AccountProvider. Pages under it still check
 * their own permissions.
 */
export default async function AccountLayout({ children, params }: Props) {
  const { account: slug } = await params;
  const context = isValidSlug(slug) ? await getAccountContext(slug) : null;

  if (!context) {
    notFound();
  }

  const [claims, memberships] = await Promise.all([requireClaims(), listMyAccounts()]);

  return (
    <AccountProvider value={context}>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-10 border-b border-separator bg-background">
          <div className="flex h-14 items-center gap-1 px-4 sm:px-6">
            <NextLink
              aria-label={context.account.name}
              className="shrink-0"
              href={accountPath(slug)}
            >
              <BrandMark className="size-7 text-accent" />
            </NextLink>
            <span
              aria-hidden="true"
              className="px-1 text-muted"
            >
              /
            </span>
            <AccountSwitcher memberships={memberships} />
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <span className="hidden truncate text-sm text-muted md:inline">{claims.email}</span>
              <LocaleSwitcher />
              <ThemeSwitch />
              <SignOutButton />
            </div>
          </div>
          <AccountNav />
        </header>
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </AccountProvider>
  );
}
