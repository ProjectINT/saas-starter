"use client";

import { FieldError, Input, Label, TextField } from "@heroui/react";

export function EmailField({ autoFocus, defaultValue }: { autoFocus?: boolean; defaultValue?: string }) {
  return (
    <TextField
      isRequired
      autoFocus={autoFocus}
      defaultValue={defaultValue}
      name="email"
      type="email"
    >
      <Label>Email</Label>
      <Input
        autoComplete="email"
        placeholder="you@example.com"
      />
      <FieldError />
    </TextField>
  );
}
