import type { ReactNode } from "react";

import { Card } from "@heroui/react";

/** One block of a settings page: a heading, a short explanation, the controls. */
export function SettingsCard({ title, description, children, tone }: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  /** danger: irreversible actions (deleting the account). */
  tone?: "danger";
}) {
  return (
    <Card className={tone === "danger" ? "border border-danger/40" : undefined}>
      <Card.Header>
        <Card.Title className={tone === "danger" ? "text-danger" : undefined}>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
      </Card.Header>
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}
