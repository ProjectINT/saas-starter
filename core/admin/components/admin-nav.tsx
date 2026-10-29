"use client";

import { cn } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { routes } from "@/core/config/routes";

const ITEMS = [
  { href: routes.adminAccounts, label: "accounts" },
  { href: routes.adminUsers, label: "users" },
] as const;

export function AdminNav() {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("navLabel")}
      className="flex gap-1 overflow-x-auto px-2 sm:px-4"
    >
      {ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <NextLink
            key={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              isActive ? "border-accent font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
            href={item.href}
          >
            {t(`${item.label}.title`)}
          </NextLink>
        );
      })}
    </nav>
  );
}
