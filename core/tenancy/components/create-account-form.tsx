"use client";

import { Button, Description, FieldError, Form, Input, InputGroup, Label, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useForm, useStoreContext } from "palistor";
import { useState, type FormEvent } from "react";

import { textFieldProps } from "@/core/ui/field-props";
import { Notice } from "@/core/ui/notice";
import { ACCOUNT_NAME_MAX_LENGTH } from "@/core/validation/account-name";
import { SLUG_HINT, SLUG_MAX_LENGTH } from "@/core/validation/slug";

import { createAccountStore, type CreateAccountContext } from "../create-account-store";

/** Account name + URL slug. The slug follows the name until edited by hand. */
export function CreateAccountForm({ urlPrefix }: { urlPrefix: string }) {
  const router = useRouter();
  const [store] = useState(createAccountStore);

  useStoreContext(store, { router } satisfies CreateAccountContext);

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
        <Label>Account name</Label>
        <Input placeholder="Acme Inc." />
        <FieldError>{form.name.errorMessage}</FieldError>
      </TextField>
      <TextField
        maxLength={SLUG_MAX_LENGTH}
        {...textFieldProps(form.slug)}
      >
        <Label>URL</Label>
        <InputGroup>
          <InputGroup.Prefix>{urlPrefix}</InputGroup.Prefix>
          <InputGroup.Input
            autoCapitalize="none"
            placeholder="acme"
            spellCheck={false}
          />
        </InputGroup>
        <Description>{SLUG_HINT}</Description>
        <FieldError>{form.slug.errorMessage}</FieldError>
      </TextField>
      <Button
        fullWidth
        isPending={form.submitting || form.redirecting.value}
        type="submit"
      >
        Create account
      </Button>
    </Form>
  );
}
