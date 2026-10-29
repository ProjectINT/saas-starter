import type { ReactNode } from "react";

export function AuthHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-muted">{description}</p>}
    </div>
  );
}
