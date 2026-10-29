"use client";

import { Moon, Sun } from "@gravity-ui/icons";
import { Button, useIsHydrated } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

/** Light/dark toggle. The theme is unknown during SSR, so the icon settles after hydration. */
export function ThemeSwitch() {
  const t = useTranslations("Common");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = useIsHydrated() && resolvedTheme === "dark";

  return (
    <Button
      isIconOnly
      aria-label={isDark ? t("lightTheme") : t("darkTheme")}
      size="sm"
      variant="ghost"
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
