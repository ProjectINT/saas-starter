import type { ReactNode } from "react";

import { BrandMark } from "./brand-logo";

/** Full-page message for error and not-found pages, with actions below it. */
export function ErrorScreen({ title, description, note, children }: { title: string; description: string; note?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <BrandMark className="size-10 text-accent" />
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted">{description}</p>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </main>
  );
}
