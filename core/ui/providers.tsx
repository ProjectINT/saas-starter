"use client";

import type { ReactNode } from "react";

import { RouterProvider, Toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";

/**
 * Client providers for the whole app. HeroUI v3 needs no provider of its own:
 * - next-themes toggles the `dark` class HeroUI's theme reads;
 * - RouterProvider makes HeroUI components with `href` navigate client-side;
 * - Toast.Provider renders toasts raised with `toast()` from @heroui/react.
 */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider
      disableTransitionOnChange
      enableSystem
      attribute="class"
      defaultTheme="system"
    >
      <RouterProvider navigate={(href) => router.push(href)}>
        {children}
        <Toast.Provider placement="bottom end" />
      </RouterProvider>
    </ThemeProvider>
  );
}
