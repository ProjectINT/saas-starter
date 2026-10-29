"use client";

import { Envelope } from "@gravity-ui/icons";
import { Button, Form } from "@heroui/react";
import { useState, type FormEvent } from "react";

import { useCaptcha } from "@/core/auth/captcha";
import { authErrorMessage } from "@/core/auth/errors";
import { authCallbackUrl } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { AppLink, ButtonLink } from "@/core/ui/links";
import { Notice } from "@/core/ui/notice";

import { AuthHeading } from "./auth-heading";
import { EmailField } from "./email-field";

/**
 * Requests a password reset email. The link signs the user in with a recovery
 * session and lands on /reset-password. The result screen never says whether
 * the email is registered.
 */
export function ForgotPasswordView() {
  const captcha = useCaptcha();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = String(new FormData(event.currentTarget).get("email"));

    setIsPending(true);
    setError(null);

    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      // Used by the default Supabase template; ours links to /auth/confirm.
      redirectTo: authCallbackUrl(routes.resetPassword),
      captchaToken: captcha.token,
    });

    captcha.reset();
    setIsPending(false);

    if (error) {
      setError(authErrorMessage(error));

      return;
    }

    setSentTo(email);
  }

  if (sentTo) {
    return (
      <>
        <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Envelope className="size-6" />
        </div>
        <AuthHeading
          description={(
            <>
              If an account exists for <strong>{sentTo}</strong>, we sent it a link to set a new password. The link expires in an
              hour.
            </>
          )}
          title="Check your email"
        />
        <ButtonLink
          fullWidth
          href={routes.signIn}
          variant="secondary"
        >
          Back to sign in
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        description="Enter your email and we will send you a link to set a new password."
        title="Forgot your password?"
      />
      <Form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        {error && <Notice>{error}</Notice>}
        <EmailField autoFocus />
        {captcha.widget}
        <Button
          fullWidth
          isDisabled={!captcha.isReady}
          isPending={isPending}
          type="submit"
        >
          Send reset link
        </Button>
      </Form>
      <p className="text-center text-sm text-muted">
        Remembered it? <AppLink href={routes.signIn}>Back to sign in</AppLink>
      </p>
    </>
  );
}
