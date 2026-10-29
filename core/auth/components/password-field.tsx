"use client";

import { Eye, EyeSlash } from "@gravity-ui/icons";
import { Button, Description, FieldError, InputGroup, Label, TextField } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface PasswordFieldProps {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  description?: string;
  value?: string;
  onChange?: (value: string) => void;
  validate?: (value: string) => string | null;
  /** Controlled validation (palistor forms): set both instead of `validate`. */
  isInvalid?: boolean;
  errorMessage?: string;
}

/** Required password input with a show/hide toggle. */
export function PasswordField({ label, name, autoComplete, description, value, onChange, validate, isInvalid, errorMessage }: PasswordFieldProps) {
  const t = useTranslations("Auth");
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      isRequired
      isInvalid={isInvalid}
      name={name}
      validate={validate}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <InputGroup>
        <InputGroup.Input
          autoComplete={autoComplete}
          type={isVisible ? "text" : "password"}
        />
        <InputGroup.Suffix className="pe-0">
          <Button
            isIconOnly
            aria-label={isVisible ? t("hidePassword") : t("showPassword")}
            size="sm"
            variant="ghost"
            onPress={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </TextField>
  );
}
