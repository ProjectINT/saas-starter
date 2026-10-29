import type { SVGProps } from "react";

import { cn } from "@heroui/react";

import { siteConfig } from "@/core/config/site";

/** Placeholder logo mark. Replace with the product's own. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 32 32"
      {...props}
    >
      <rect
        fill="currentColor"
        height="32"
        rx="8"
        width="32"
      />
      <path
        d="M10 21.5 16 9l6 12.5M12.5 17h7"
        stroke="var(--accent-foreground, #fff)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function BrandLogo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className="size-7 shrink-0 text-accent" />
      {showName && <span className="text-lg font-semibold">{siteConfig.name}</span>}
    </span>
  );
}
