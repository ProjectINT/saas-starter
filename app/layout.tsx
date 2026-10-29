import type { Metadata } from "next";
import type { ReactNode } from "react";

import { siteConfig } from "@/core/config/site";
import { Providers } from "@/core/ui/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html
      suppressHydrationWarning
      lang="en"
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
