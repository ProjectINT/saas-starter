"use client";

import { cn } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { accountSettingsPath } from "@/core/config/routes";
import { SETTINGS_SECTIONS, visibleItems, type SettingsSection } from "@/core/navigation/registry";
import { useAccount } from "@/core/tenancy/components/account-provider";

const GROUPS: SettingsSection["group"][] = ["personal", "account"];

/** Sections of the settings from the registry (core + modules/index.ts), grouped; a row of links on small screens. */
export function SettingsNav() {
  const t = useTranslations();
  const { account, can } = useAccount();
  const pathname = usePathname();
  const sections = visibleItems(SETTINGS_SECTIONS, can);

  return (
    <nav
      aria-label={t("Settings.title")}
      className="flex gap-4 overflow-x-auto md:w-48 md:shrink-0 md:flex-col md:gap-6 md:overflow-visible"
    >
      {GROUPS.map((group) => {
        const items = sections.filter((section) => section.group === group);

        if (items.length === 0) {
          return null;
        }

        return (
          <div
            key={group}
            className="flex gap-1 md:flex-col"
          >
            <p className="hidden px-3 pb-1 text-xs font-medium text-muted uppercase md:block">{t(`Settings.groups.${group}`)}</p>
            {items.map((section) => {
              const href = accountSettingsPath(account.slug, section.segment);
              const isActive = pathname === href;

              return (
                <NextLink
                  key={section.segment}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                    isActive ? "bg-surface font-medium text-foreground" : "text-muted hover:text-foreground"
                  )}
                  href={href}
                >
                  {t(section.label)}
                </NextLink>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
