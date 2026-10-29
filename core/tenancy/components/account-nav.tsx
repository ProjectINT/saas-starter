"use client";

import type { Permission } from "../permissions.generated";
import type { Messages } from "next-intl";

import { cn } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { accountMembersPath, accountPath } from "@/core/config/routes";

import { useAccount } from "./account-provider";

interface NavItem {
  label: keyof Messages["Navigation"];
  href: (slug: string) => string;
  /** Shown only with this permission. */
  permission?: Permission;
}

// The settings phase replaces this with a configurable sidebar.
const NAV_ITEMS: NavItem[] = [
  { label: "overview", href: accountPath },
  { label: "members", href: accountMembersPath, permission: "members.view" },
];

export function AccountNav() {
  const t = useTranslations("Navigation");
  const { account, can } = useAccount();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("account")}
      className="flex gap-1 overflow-x-auto px-2 sm:px-4"
    >
      {NAV_ITEMS.filter((item) => !item.permission || can(item.permission)).map((item) => {
        const href = item.href(account.slug);
        const isActive = pathname === href;

        return (
          <NextLink
            key={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
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
