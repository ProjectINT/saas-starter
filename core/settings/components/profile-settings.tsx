"use client";

import type { ProfileForm } from "../profile-store";

import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useStoreContext, useTranslator } from "palistor";
import { useState, type FormEvent } from "react";

import { PasswordField } from "@/core/auth/components/password-field";
import { useAccount } from "@/core/tenancy/components/account-provider";
import { textFieldProps } from "@/core/ui/field-props";
import { Notice } from "@/core/ui/notice";
import { EMAIL_MAX_LENGTH } from "@/core/validation/email";
import { passwordHint } from "@/core/validation/password";
import { PROFILE_NAME_MAX_LENGTH } from "@/core/validation/profile-name";

import { createProfileStore, type ProfileContext, type ProfileInitial } from "../profile-store";

import { SettingsCard } from "./settings-card";

const submitWith = (submit: () => Promise<unknown>) => (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  void submit();
};

/** Name, email and password of the signed-in user. `pendingEmail`: a change still waiting for confirmation. */
export function ProfileSettings({ initial, userId, pendingEmail }: { initial: ProfileInitial; userId: string; pendingEmail: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { account } = useAccount();
  const [store] = useState(() => createProfileStore(initial));

  useStoreContext(store, { userId, slug: account.slug, router, t } satisfies ProfileContext);
  useTranslator(store, t);

  const form = useForm(store);

  return (
    <>
      <NameCard name={form.name} />
      <EmailCard
        email={form.email}
        pendingEmail={pendingEmail}
      />
      <PasswordCard password={form.password} />
    </>
  );
}

function NameCard({ name }: { name: ProfileForm["name"] }) {
  const t = useTranslations();
  const form = useForm(name);

  return (
    <SettingsCard
      description={t("Settings.profile.nameDescription")}
      title={t("Settings.profile.nameTitle")}
    >
      <Form
        className="flex flex-col gap-4"
        validationBehavior="aria"
        onSubmit={submitWith(form.submit)}
      >
        {form.formError.value && <Notice>{form.formError.value}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            autoComplete="given-name"
            maxLength={PROFILE_NAME_MAX_LENGTH}
            {...textFieldProps(form.firstName)}
          >
            <Label>{t("Settings.profile.firstName")}</Label>
            <Input />
          </TextField>
          <TextField
            autoComplete="family-name"
            maxLength={PROFILE_NAME_MAX_LENGTH}
            {...textFieldProps(form.lastName)}
          >
            <Label>{t("Settings.profile.lastName")}</Label>
            <Input />
          </TextField>
        </div>
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

function EmailCard({ email, pendingEmail }: { email: ProfileForm["email"]; pendingEmail: string }) {
  const t = useTranslations();
  const form = useForm(email);
  const sentTo = form.sentTo.value;

  return (
    <SettingsCard
      description={t("Settings.profile.emailDescription", { email: form.current.value })}
      title={t("Settings.profile.emailTitle")}
    >
      <Form
        className="flex flex-col gap-4"
        validationBehavior="aria"
        onSubmit={submitWith(form.submit)}
      >
        {sentTo && <Notice status="success">{t("Settings.profile.emailSent", { current: form.current.value, next: sentTo })}</Notice>}
        {!sentTo && pendingEmail && <Notice status="accent">{t("Settings.profile.emailPending", { email: pendingEmail })}</Notice>}
        <TextField
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
          type="email"
          {...textFieldProps(form.email)}
        >
          <Label>{t("Settings.profile.newEmail")}</Label>
          <Input />
          <FieldError>{form.email.errorMessage}</FieldError>
        </TextField>
        <Button
          className="self-start"
          isPending={form.submitting}
          type="submit"
          variant="secondary"
        >
          {t("Settings.profile.changeEmail")}
        </Button>
      </Form>
    </SettingsCard>
  );
}

function PasswordCard({ password }: { password: ProfileForm["password"] }) {
  const t = useTranslations();
  const form = useForm(password);

  return (
    <SettingsCard
      description={t("Settings.profile.passwordDescription")}
      title={t("Settings.profile.passwordTitle")}
    >
      <Form
        className="flex flex-col gap-4"
        validationBehavior="aria"
        onSubmit={submitWith(form.submit)}
      >
        <PasswordField
          autoComplete="new-password"
          description={passwordHint(t)}
          errorMessage={form.password.errorMessage}
          isInvalid={Boolean(form.password.isInvalid)}
          label={t("Settings.profile.newPassword")}
          name="password"
          value={form.password.value}
          onChange={form.password.onValueChange}
        />
        <PasswordField
          autoComplete="new-password"
          errorMessage={form.confirm.errorMessage}
          isInvalid={Boolean(form.confirm.isInvalid)}
          label={t("Settings.profile.confirmPassword")}
          name="confirm"
          value={form.confirm.value}
          onChange={form.confirm.onValueChange}
        />
        <Button
          className="self-start"
          isPending={form.submitting}
          type="submit"
          variant="secondary"
        >
          {t("Settings.profile.changePassword")}
        </Button>
      </Form>
    </SettingsCard>
  );
}
