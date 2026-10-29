"use client";

import type { AccountSettingsForm } from "../account-settings-store";

import { Button, Description, FieldError, Form, Input, InputGroup, Label, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useStoreContext, useTranslator } from "palistor";
import { useState, type FormEvent } from "react";

import { useAccount } from "@/core/tenancy/components/account-provider";
import { ConfirmDialog } from "@/core/ui/confirm-dialog";
import { textFieldProps } from "@/core/ui/field-props";
import { Notice } from "@/core/ui/notice";
import { ACCOUNT_NAME_MAX_LENGTH } from "@/core/validation/account-name";
import { SLUG_MAX_LENGTH, slugHint } from "@/core/validation/slug";

import { createAccountSettingsStore, type AccountSettingsContext } from "../account-settings-store";

import { SettingsCard } from "./settings-card";

/** Name and URL of the account; deletion for those with account.delete. `urlPrefix`: the site origin shown before the slug. */
export function AccountSettings({ urlPrefix }: { urlPrefix: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { account, can } = useAccount();
  const [store] = useState(() => createAccountSettingsStore({ name: account.name, slug: account.slug }));

  useStoreContext(store, { accountId: account.id, slug: account.slug, name: account.name, router, t } satisfies AccountSettingsContext);
  useTranslator(store, t);

  const form = useForm(store);

  return (
    <>
      <GeneralCard
        general={form.general}
        urlPrefix={urlPrefix}
      />
      {can("account.delete") && <DeleteCard deletion={form.deletion} />}
    </>
  );
}

function GeneralCard({ general, urlPrefix }: { general: AccountSettingsForm["general"]; urlPrefix: string }) {
  const t = useTranslations();
  const { account } = useAccount();
  const form = useForm(general);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit();
  }

  return (
    <SettingsCard
      description={t("Settings.account.generalDescription")}
      title={t("Settings.account.generalTitle")}
    >
      <Form
        className="flex flex-col gap-4"
        validationBehavior="aria"
        onSubmit={handleSubmit}
      >
        {form.formError.value && <Notice>{form.formError.value}</Notice>}
        <TextField
          maxLength={ACCOUNT_NAME_MAX_LENGTH}
          {...textFieldProps(form.name)}
        >
          <Label>{t("Accounts.create.name")}</Label>
          <Input />
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
              spellCheck={false}
            />
          </InputGroup>
          <Description>
            {form.slug.value === account.slug ? slugHint(t) : t("Settings.account.urlChanged")}
          </Description>
          <FieldError>{form.slug.errorMessage}</FieldError>
        </TextField>
        <Button
          className="self-start"
          isPending={form.submitting}
          type="submit"
        >
          {t("Settings.save")}
        </Button>
      </Form>
    </SettingsCard>
  );
}

function DeleteCard({ deletion }: { deletion: AccountSettingsForm["deletion"] }) {
  const t = useTranslations();
  const { account } = useAccount();
  const form = useForm(deletion);

  return (
    <SettingsCard
      description={t("Settings.account.deleteDescription", { account: account.name })}
      title={t("Settings.account.deleteTitle")}
      tone="danger"
    >
      <Button
        variant="danger"
        onPress={() => {
          form.reset();
          form.setValues({ isOpen: true });
        }}
      >
        {t("Settings.account.deleteTitle")}
      </Button>
      <ConfirmDialog
        confirmLabel={t("Settings.account.deleteTitle")}
        isOpen={form.isOpen.value}
        isPending={form.submitting}
        title={t("Settings.account.deleteConfirmTitle", { account: account.name })}
        onConfirm={() => void form.submit()}
        onOpenChange={(isOpen) => form.setValues({ isOpen })}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t("Settings.account.deleteConfirmBody", { slug: account.slug })}</p>
          <TextField
            autoFocus
            aria-label={t("Settings.account.deleteConfirmLabel")}
            {...textFieldProps(form.confirmation)}
          >
            <Input
              autoCapitalize="none"
              placeholder={account.slug}
              spellCheck={false}
            />
            <FieldError>{form.confirmation.errorMessage}</FieldError>
          </TextField>
        </div>
      </ConfirmDialog>
    </SettingsCard>
  );
}
