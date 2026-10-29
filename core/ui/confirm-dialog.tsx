"use client";

import type { ReactNode } from "react";

import { AlertDialog, Button } from "@heroui/react";
import { useTranslations } from "next-intl";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  confirmLabel: string;
  status?: "danger" | "warning" | "accent";
  /** True while the confirmed action runs. The caller closes the dialog when it succeeds. */
  isPending?: boolean;
  onConfirm: () => void;
}

/** Controlled confirmation for destructive or irreversible actions, e.g. opened from a menu. */
export function ConfirmDialog({ isOpen, onOpenChange, title, children, confirmLabel, status = "danger", isPending = false, onConfirm }: ConfirmDialogProps) {
  const t = useTranslations("Common");

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
              {t("cancel")}
            </Button>
            <Button
              isPending={isPending}
              variant={status === "danger" ? "danger" : "primary"}
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
