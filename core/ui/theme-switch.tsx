"use client";

import { Moon, Sun } from "@gravity-ui/icons";
import { Button, useIsHydrated } from "@heroui/react";
import { useTheme } from "next-themes";

/** Light/dark toggle. The theme is unknown during SSR, so the icon settles after hydration. */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = useIsHydrated() && resolvedTheme === "dark";

  return (
    <Button
      isIconOnly
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      size="sm"
      variant="ghost"
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
