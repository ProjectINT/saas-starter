"use client";

import { Button, Form, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authErrorMessage } from "@/core/auth/errors";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { Notice } from "@/core/ui/notice";
import { PASSWORD_HINT, validatePassword } from "@/core/validation/password";

import { PasswordField } from "./password-field";

/** Sets a new password for the signed-in user (after a recovery link or from settings). */
export function ResetPasswordForm() {
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
      setError(authErrorMessage(error));
      setIsPending(false);

      return;
    }

    toast.success("Your password has been updated.");
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
        description={PASSWORD_HINT}
        label="New password"
        name="password"
        validate={validatePassword}
        value={password}
        onChange={setPassword}
      />
      <PasswordField
        autoComplete="new-password"
        label="Confirm new password"
        name="confirmPassword"
        validate={(value) => (value === password ? null : "Passwords do not match.")}
      />
      <Button
        fullWidth
        isPending={isPending}
        type="submit"
      >
        Update password
      </Button>
    </Form>
  );
}
