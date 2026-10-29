"use client";

import type { AuthError } from "@supabase/supabase-js";

import { Button, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { OAuthProvider } from "@/core/auth/oauth";
import { useCaptcha } from "@/core/auth/captcha";
import { authErrorMessage } from "@/core/auth/errors";
import { withNext } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { AppLink } from "@/core/ui/links";
import { Notice } from "@/core/ui/notice";

import { AuthHeading } from "./auth-heading";
import { CheckEmail } from "./check-email";
import { EmailField } from "./email-field";
import { PasswordField } from "./password-field";
import { SocialButtons } from "./social-buttons";

interface SignInViewProps {
  /** Path to open after signing in, already checked by safeNextPath. */
  next: string;
  providers: OAuthProvider[];
}

/** Sign-in screen: OAuth buttons and email + password. */
export function SignInView({ next, providers }: SignInViewProps) {
  const router = useRouter();
  const captcha = useCaptcha();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")), password: String(form.get("password")) };

    setEmail(credentials.email);
    setIsPending(true);
    setError(null);

    const { error } = await createClient().auth.signInWithPassword({
      ...credentials,
      options: { captchaToken: captcha.token },
    });

    captcha.reset();

    if (error) {
      setError(error);
      setIsPending(false);

      return;
    }

    // Stay pending until the next page renders; refresh drops RSC payloads cached while signed out.
    router.replace(next);
    router.refresh();
  }

  if (error?.code === "email_not_confirmed") {
    return (
      <CheckEmail
        email={email}
        title="Confirm your email"
        onBack={() => setError(null)}
      >
        Your email address is not confirmed yet. Open the link we sent to <strong>{email}</strong>, or request a new one.
      </CheckEmail>
    );
  }

  return (
    <>
      <AuthHeading
        description="Sign in to your account to continue."
        title="Welcome back"
      />
      <SocialButtons
        next={next}
        providers={providers}
      />
      <Form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        {error && <Notice>{authErrorMessage(error)}</Notice>}
        <EmailField
          autoFocus
          defaultValue={email}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            autoComplete="current-password"
            label="Password"
            name="password"
          />
          <AppLink
            className="self-end text-sm"
            href={routes.forgotPassword}
          >
            Forgot password?
          </AppLink>
        </div>
        {captcha.widget}
        <Button
          fullWidth
          isDisabled={!captcha.isReady}
          isPending={isPending}
          type="submit"
        >
          Sign in
        </Button>
      </Form>
      <p className="text-center text-sm text-muted">
        No account yet? <AppLink href={withNext(routes.signUp, next)}>Sign up</AppLink>
      </p>
    </>
  );
}
