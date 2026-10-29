"use client";

import { cn } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { accountSectionPath } from "@/core/config/routes";
import { ACCOUNT_NAVIGATION, visibleItems } from "@/core/navigation/registry";

import { useAccount } from "./account-provider";

/** Tabs of the account frame, from the navigation registry (core items + modules/index.ts). */
export function AccountNav() {
  const t = useTranslations();
  const { account, can } = useAccount();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("Navigation.account")}
      className="flex gap-1 overflow-x-auto px-2 sm:px-4"
    >
      {visibleItems(ACCOUNT_NAVIGATION, can).map((item) => {
        const href = accountSectionPath(account.slug, item.segment);
        // The home tab is active only on the home page; the others also on pages below them.
        const isActive = item.segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;

        return (
          <NextLink
            key={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              isActive ? "border-accent font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
            href={href}
          >
            {t(item.label)}
          </NextLink>
        );
      })}
    </nav>
  );
}
