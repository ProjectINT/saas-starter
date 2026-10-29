"use client";

import { Button, Description, FieldError, Form, Input, InputGroup, Label, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useStoreContext, useTranslator } from "palistor";
import { useState, type FormEvent } from "react";

import { textFieldProps } from "@/core/ui/field-props";
import { Notice } from "@/core/ui/notice";
import { ACCOUNT_NAME_MAX_LENGTH } from "@/core/validation/account-name";
import { SLUG_MAX_LENGTH, slugHint } from "@/core/validation/slug";

import { createAccountStore, type CreateAccountContext } from "../create-account-store";

/** Account name + URL slug. The slug follows the name until edited by hand. */
export function CreateAccountForm({ urlPrefix }: { urlPrefix: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [store] = useState(createAccountStore);

  useStoreContext(store, { router, t } satisfies CreateAccountContext);
  useTranslator(store, t);

  const { account: form } = useForm(store);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit();
  }

  return (
    <Form
      className="flex flex-col gap-4"
      validationBehavior="aria"
      onSubmit={handleSubmit}
    >
      {form.formError.value && <Notice>{form.formError.value}</Notice>}
      <TextField
        autoFocus
        maxLength={ACCOUNT_NAME_MAX_LENGTH}
        {...textFieldProps(form.name)}
      >
        <Label>{t("Accounts.create.name")}</Label>
        <Input placeholder={t("Accounts.create.namePlaceholder")} />
        <FieldError>{form.name.errorMessage}</FieldError>
      </TextField>
      <TextField
        maxLength={SLUG_MAX_LENGTH}
        {...textFieldProps(form.slug)}
      >
        <Label>{t("Accounts.create.url")}</Label>
        <InputGroup>
          <InputGroup.Prefix>{urlPrefix}</InputGroup.Prefix>
          <InputGroup.Input
            autoCapitalize="none"
            placeholder={t("Accounts.create.urlPlaceholder")}
            spellCheck={false}
          />
        </InputGroup>
        <Description>{slugHint(t)}</Description>
        <FieldError>{form.slug.errorMessage}</FieldError>
      </TextField>
      <Button
        fullWidth
        isPending={form.submitting || form.redirecting.value}
        type="submit"
      >
        {t("Accounts.create.submit")}
      </Button>
    </Form>
  );
}
