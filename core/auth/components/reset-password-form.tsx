"use client";

import { Button, Form, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { authErrorMessage } from "@/core/auth/errors";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { Notice } from "@/core/ui/notice";
import { passwordHint, validatePassword } from "@/core/validation/password";

import { PasswordField } from "./password-field";

/** Sets a new password for the signed-in user (after a recovery link or from settings). */
export function ResetPasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const { error } = await createClient().auth.updateUser({ password });

    if (error) {
      setError(authErrorMessage(error, t));
      setIsPending(false);

      return;
    }

    toast.success(t("Auth.resetPassword.updated"));
    router.replace(routes.accounts);
    router.refresh();
  }

  return (
    <Form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      {error && <Notice>{error}</Notice>}
      <PasswordField
        autoComplete="new-password"
        description={passwordHint(t)}
        label={t("Auth.resetPassword.newPassword")}
        name="password"
        validate={(value) => validatePassword(value, t)}
        value={password}
        onChange={setPassword}
      />
      <PasswordField
        autoComplete="new-password"
        label={t("Auth.resetPassword.confirmPassword")}
        name="confirmPassword"
        validate={(value) => (value === password ? null : t("Validation.passwordMismatch"))}
      />
      <Button
        fullWidth
        isPending={isPending}
        type="submit"
      >
        {t("Auth.resetPassword.submit")}
      </Button>
    </Form>
  );
}
