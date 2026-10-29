"use client";

import { FieldError, Input, Label, TextField } from "@heroui/react";
import { useTranslations } from "next-intl";

export function EmailField({ autoFocus, defaultValue }: { autoFocus?: boolean; defaultValue?: string }) {
  const t = useTranslations();

  return (
    <TextField
      isRequired
      autoFocus={autoFocus}
      defaultValue={defaultValue}
      name="email"
      type="email"
    >
      <Label>{t("Common.email")}</Label>
      <Input
        autoComplete="email"
        placeholder={t("Auth.emailPlaceholder")}
      />
      <FieldError />
    </TextField>
  );
}
