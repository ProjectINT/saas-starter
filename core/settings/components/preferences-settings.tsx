"use client";

import type { Key } from "react";

import { Button, ComboBox, Input, Label, ListBox, Radio, RadioGroup, Select, toast, useIsHydrated } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useMemo, useTransition } from "react";

import { setLocale, setTimeZone } from "@/core/i18n/actions";
import { LOCALES, LOCALE_NAMES } from "@/core/i18n/config";

import { SettingsCard } from "./settings-card";

// Choices that apply at once (no Save button): the theme in this browser,
// the language and the time zone in a cookie and the profile.

const THEMES = ["light", "dark", "system"] as const;

const THEME_LABELS = {
  light: "Settings.preferences.themeLight",
  dark: "Settings.preferences.themeDark",
  system: "Settings.preferences.themeSystem",
} as const;

export function PreferencesSettings() {
  return (
    <>
      <ThemeCard />
      <LanguageCard />
      <TimeZoneCard />
    </>
  );
}

function ThemeCard() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  // next-themes knows the theme only in the browser.
  const isHydrated = useIsHydrated();

  return (
    <SettingsCard
      description={t("Settings.preferences.themeDescription")}
      title={t("Settings.preferences.themeTitle")}
    >
      <RadioGroup
        aria-label={t("Settings.preferences.themeTitle")}
        orientation="horizontal"
        value={isHydrated ? theme ?? "system" : null}
        onChange={setTheme}
      >
        {THEMES.map((item) => (
          <Radio
            key={item}
            value={item}
          >
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <Label>{t(THEME_LABELS[item])}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
    </SettingsCard>
  );
}

/** Applies a server-side preference, then re-renders the page with it. */
function useApply() {
  const router = useRouter();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const apply = (action: () => Promise<unknown>) => startTransition(async () => {
    await action();
    toast.success(t("Settings.preferences.saved"));
    router.refresh();
  });

  return { isPending, apply };
}

function LanguageCard() {
  const t = useTranslations();
  const locale = useLocale();
  const { isPending, apply } = useApply();

  function choose(key: Key | null) {
    const next = String(key);

    if (key !== null && next !== locale) {
      apply(() => setLocale(next));
    }
  }

  return (
    <SettingsCard
      description={t("Settings.preferences.languageDescription")}
      title={t("Settings.preferences.languageTitle")}
    >
      <Select
        aria-label={t("Settings.preferences.languageTitle")}
        className="max-w-xs"
        isDisabled={isPending}
        value={locale}
        onChange={choose}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {LOCALES.map((item) => (
              <ListBox.Item
                key={item}
                id={item}
                lang={item}
                textValue={LOCALE_NAMES[item]}
              >
                {LOCALE_NAMES[item]}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsCard>
  );
}

function TimeZoneCard() {
  const t = useTranslations();
  const timeZone = useTimeZone();
  const isHydrated = useIsHydrated();
  const { isPending, apply } = useApply();
  const zones = useMemo(() => Intl.supportedValuesOf("timeZone").map((id) => ({ id })), []);
  // The device's zone is known only in the browser.
  const deviceZone = isHydrated ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;

  function choose(key: Key | null) {
    const next = key === null ? null : String(key);

    if (next && next !== timeZone) {
      apply(() => setTimeZone(next));
    }
  }

  return (
    <SettingsCard
      description={t("Settings.preferences.timeZoneDescription")}
      title={t("Settings.preferences.timeZoneTitle")}
    >
      <div className="flex flex-wrap items-end gap-3">
        <ComboBox
          className="w-full max-w-xs"
          isDisabled={isPending}
          items={zones}
          selectedKey={timeZone}
          onSelectionChange={choose}
        >
          <Label>{t("Settings.preferences.timeZone")}</Label>
          <ComboBox.InputGroup>
            <Input />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox renderEmptyState={() => <p className="p-2 text-sm text-muted">{t("Settings.preferences.noTimeZones")}</p>}>
              {(zone: { id: string }) => (
                <ListBox.Item
                  id={zone.id}
                  textValue={zone.id}
                >
                  {zone.id}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              )}
            </ListBox>
          </ComboBox.Popover>
        </ComboBox>
        {deviceZone && deviceZone !== timeZone && (
          <Button
            isDisabled={isPending}
            variant="tertiary"
            onPress={() => choose(deviceZone)}
          >
            {t("Settings.preferences.useDeviceTimeZone", { timeZone: deviceZone })}
          </Button>
        )}
      </div>
    </SettingsCard>
  );
}
