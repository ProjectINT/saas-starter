import type { ComponentProps } from "react";

import { buttonVariants, linkVariants, type ButtonVariants } from "@heroui/styles";
import NextLink from "next/link";

// Next.js links styled as HeroUI components (prefetching and client routing
// stay with next/link). Safe in Server Components: @heroui/styles has no React.

type NextLinkProps = ComponentProps<typeof NextLink>;

const linkSlots = linkVariants();

export function AppLink({ className, ...props }: NextLinkProps) {
  return (
    <NextLink
      className={linkSlots.base({ className })}
      {...props}
    />
  );
}

export function ButtonLink({ className, fullWidth, size, variant, ...props }: NextLinkProps & ButtonVariants) {
  return (
    <NextLink
      className={buttonVariants({ className, fullWidth, size, variant })}
      {...props}
    />
  );
}
