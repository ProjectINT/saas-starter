"use client";

import type { Membership } from "../accounts";

import { Check, ChevronsExpandVertical, Plus } from "@gravity-ui/icons";
import { Button, Dropdown, Label, Separator } from "@heroui/react";
import { useTranslations } from "next-intl";

import { accountPath, routes } from "@/core/config/routes";

import { useAccount } from "./account-provider";

/** Current account name; opens the list of the user's accounts and "Create account". */
export function AccountSwitcher({ memberships }: { memberships: Membership[] }) {
  const t = useTranslations();
  const { account } = useAccount();

  return (
    <Dropdown>
      <Button
        className="max-w-56 min-w-0"
        size="sm"
        variant="ghost"
      >
        <span className="truncate font-medium">{account.name}</span>
        <ChevronsExpandVertical className="size-3.5 shrink-0 text-muted" />
      </Button>
      <Dropdown.Popover
        className="min-w-60"
        placement="bottom start"
      >
        <Dropdown.Menu aria-label={t("Accounts.switcher.label")}>
          {memberships.map(({ account: item, role }) => (
            <Dropdown.Item
              key={item.id}
              href={accountPath(item.slug)}
              id={item.id}
              textValue={item.name}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <Label className="truncate">{item.name}</Label>
                <span className="text-xs text-muted">{t(`Roles.${role}`)}</span>
              </span>
              {item.id === account.id && <Check className="size-4 shrink-0 text-accent" />}
            </Dropdown.Item>
          ))}
          <Separator />
          <Dropdown.Item
            href={routes.onboarding}
            id="create"
            textValue={t("Accounts.switcher.create")}
          >
            <Plus className="size-4" />
            <Label>{t("Accounts.switcher.create")}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
