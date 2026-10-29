"use client";

import type { ReactNode } from "react";

import { AlertDialog, Button, toast } from "@heroui/react";
import { useTransition } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  confirmLabel: string;
  status?: "danger" | "warning" | "accent";
  /**
   * Runs on confirm. Return an error message to show it and keep the dialog
   * open; return null to close it. Server Actions that redirect just navigate.
   */
  onConfirm: () => Promise<string | null>;
}

/** Controlled confirmation for destructive or irreversible actions, e.g. opened from a menu. */
export function ConfirmDialog({ isOpen, onOpenChange, title, children, confirmLabel, status = "danger", onConfirm }: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const error = await onConfirm();

      if (error) {
        toast.danger(error);

        return;
      }

      onOpenChange(false);
    });
  }

  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status={status} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>{children}</AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              slot="close"
              variant="tertiary"
            >
              Cancel
            </Button>
            <Button
              isPending={isPending}
              variant={status === "danger" ? "danger" : "primary"}
              onPress={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
