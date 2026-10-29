"use client";


import { Button, Checkbox, FieldError, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { OAuthProvider } from "@/core/auth/oauth";
import { useCaptcha } from "@/core/auth/captcha";
import { authErrorMessage } from "@/core/auth/errors";
import { authCallbackUrl, withNext } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { AppLink } from "@/core/ui/links";
import { Notice } from "@/core/ui/notice";
import { PASSWORD_HINT, validatePassword } from "@/core/validation/password";

import { AuthHeading } from "./auth-heading";
import { CheckEmail } from "./check-email";
import { EmailField } from "./email-field";
import { PasswordField } from "./password-field";
import { SocialButtons } from "./social-buttons";

interface SignUpViewProps {
  /** Path to open after signing up, already checked by safeNextPath. */
  next: string;
  providers: OAuthProvider[];
}

/**
 * Sign-up screen. Creates only the auth user (and, via trigger, the profile);
 * the first account is created on /onboarding. With email confirmation on,
 * Supabase answers the same way for new and existing emails, so the screen
 * always ends on "check your email".
 */
export function SignUpView({ next, providers }: SignUpViewProps) {
  const router = useRouter();
  const captcha = useCaptcha();
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = String(new FormData(event.currentTarget).get("email"));

    setIsPending(true);
    setError(null);

    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      // emailRedirectTo serves the default Supabase email template; the
      // template in supabase/templates links to /auth/confirm instead.
      options: { emailRedirectTo: authCallbackUrl(), captchaToken: captcha.token },
    });

    captcha.reset();

    if (error) {
      setError(authErrorMessage(error));
      setIsPending(false);

      return;
    }

    // Email confirmation disabled: the user is signed in right away.
    if (data.session) {
      router.replace(next);
      router.refresh();

      return;
    }

    setSentTo(email);
    setIsPending(false);
  }

  if (sentTo) {
    return (
      <CheckEmail
        email={sentTo}
        title="Check your email"
      >
        We sent a confirmation link to <strong>{sentTo}</strong>. Open it to finish signing up.
      </CheckEmail>
    );
  }

  return (
    <>
      <AuthHeading
        description="Sign up to get started. It takes a minute."
        title="Create your account"
      />
      <SocialButtons
        next={next}
        providers={providers}
      />
      <Form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        {error && <Notice>{error}</Notice>}
        <EmailField autoFocus />
        <PasswordField
          autoComplete="new-password"
          description={PASSWORD_HINT}
          label="Password"
          name="password"
          validate={validatePassword}
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          autoComplete="new-password"
          label="Confirm password"
          name="confirmPassword"
          validate={(value) => (value === password ? null : "Passwords do not match.")}
        />
        <Checkbox
          isRequired
          name="terms"
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <span className="text-sm">
              I agree to the{" "}
              <AppLink
                className="underline"
                href={routes.termsOfUse}
                target="_blank"
              >
                Terms of Use
              </AppLink>{" "}
              and{" "}
              <AppLink
                className="underline"
                href={routes.privacyPolicy}
                target="_blank"
              >
                Privacy Policy
              </AppLink>
            </span>
          </Checkbox.Content>
          <FieldError />
        </Checkbox>
        {captcha.widget}
        <Button
          fullWidth
          isDisabled={!captcha.isReady}
          isPending={isPending}
          type="submit"
        >
          Create account
        </Button>
      </Form>
      <p className="text-center text-sm text-muted">
        Already have an account? <AppLink href={withNext(routes.signIn, next)}>Sign in</AppLink>
      </p>
    </>
  );
}
