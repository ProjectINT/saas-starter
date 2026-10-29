import type { ReactNode } from "react";

import { Alert } from "@heroui/react";

/** Single-line alert for form results: errors, confirmations. */
export function Notice({ children, status = "danger" }: { children: ReactNode; status?: "danger" | "success" | "accent" | "warning" }) {
  return (
    <Alert status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{children}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}
