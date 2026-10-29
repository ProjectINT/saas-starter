"use client";

import type { Permission } from "../permissions.generated";

import { cn } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { accountMembersPath, accountPath } from "@/core/config/routes";

import { useAccount } from "./account-provider";

interface NavItem {
  label: string;
  href: (slug: string) => string;
  /** Shown only with this permission. */
  permission?: Permission;
}

// The settings phase replaces this with a configurable sidebar.
const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: accountPath },
  { label: "Members", href: accountMembersPath, permission: "members.view" },
];

export function AccountNav() {
  const { account, can } = useAccount();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account"
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
            {item.label}
          </NextLink>
        );
      })}
    </nav>
  );
}
