"use client";

import type { ReactNode } from "react";

import { Alert, Button } from "@heroui/react";

/** A failed list load with a retry, e.g. for a palistor list: `<LoadError onRetry={list.reload}>`. */
export function LoadError({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  return (
    <Alert
      className="items-center"
      status="danger"
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{children}</Alert.Title>
      </Alert.Content>
      <Button
        size="sm"
        variant="secondary"
        onPress={onRetry}
      >
        Try again
      </Button>
    </Alert>
  );
}
