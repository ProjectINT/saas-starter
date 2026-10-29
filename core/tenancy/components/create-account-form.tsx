"use client";

import { Button, Description, FieldError, Form, Input, InputGroup, Label, TextField } from "@heroui/react";
import { startTransition, useActionState, useState, type FormEvent } from "react";

import { Notice } from "@/core/ui/notice";
import { SLUG_HINT, SLUG_MAX_LENGTH, slugify, validateSlug } from "@/core/validation/slug";

import { createAccount } from "../create-account";
import { initialCreateAccountState } from "../create-account-errors";

/** Account name + URL slug. The slug follows the name until edited by hand. */
export function CreateAccountForm({ urlPrefix }: { urlPrefix: string }) {
  const [state, formAction, isPending] = useActionState(createAccount, initialCreateAccountState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugEdited, setIsSlugEdited] = useState(false);

  function handleNameChange(value: string) {
    setName(value);

    if (!isSlugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase());
    setIsSlugEdited(value !== "");
  }

  // Submitting through onSubmit (not `action`) keeps React from resetting the
  // fields when the server returns errors.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(() => formAction(formData));
  }

  // A server error stays only while its field holds the submitted value. HeroUI
  // clears it on typing, but not when the slug changes because the name did.
  const current: Record<string, string> = { name, slug };
  const serverErrors = Object.fromEntries(
    Object.entries(state.errors).filter(([field]) => current[field] === state.values[field])
  );

  return (
    <Form
      className="flex flex-col gap-4"
      validationErrors={serverErrors}
      onSubmit={handleSubmit}
    >
      {state.formError && <Notice>{state.formError}</Notice>}
      <TextField
        isRequired
        autoFocus
        maxLength={100}
        name="name"
        value={name}
        onChange={handleNameChange}
      >
        <Label>Account name</Label>
        <Input placeholder="Acme Inc." />
        <FieldError />
      </TextField>
      <TextField
        isRequired
        maxLength={SLUG_MAX_LENGTH}
        name="slug"
        validate={validateSlug}
        value={slug}
        onChange={handleSlugChange}
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
        <FieldError />
      </TextField>
      <Button
        fullWidth
        isPending={isPending}
        type="submit"
      >
        Create account
      </Button>
    </Form>
  );
}
