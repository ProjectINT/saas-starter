"use client";

import type { Key } from "react";

import { Check, Globe } from "@gravity-ui/icons";
import { Button, Dropdown, Label } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { setLocale } from "../actions";
import { LOCALES, LOCALE_NAMES } from "../config";

/** Language menu. The choice is saved in a cookie (and the profile) and the page re-renders on the server. */
export function LocaleSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(key: Key) {
    const next = String(key);

    if (next === locale) {
      return;
    }

    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <Dropdown>
      <Button
        aria-label={t("language")}
        isPending={isPending}
        size="sm"
        variant="ghost"
      >
        <Globe className="size-4" />
        <span className="uppercase">{locale}</span>
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label={t("language")}
          onAction={choose}
        >
          {LOCALES.map((item) => (
            <Dropdown.Item
              key={item}
              id={item}
              lang={item}
              textValue={LOCALE_NAMES[item]}
            >
              <Label className="flex-1">{LOCALE_NAMES[item]}</Label>
              {item === locale && <Check className="size-4 shrink-0 text-accent" />}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
