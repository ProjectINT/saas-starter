"use client";

import type { ReactNode } from "react";

import { Button, Checkbox, FieldError, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import type { OAuthProvider } from "@/core/auth/oauth";
import { useCaptcha } from "@/core/auth/captcha";
import { authErrorMessage } from "@/core/auth/errors";
import { authCallbackUrl, withNext } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { AppLink } from "@/core/ui/links";
import { Notice } from "@/core/ui/notice";
import { passwordHint, validatePassword } from "@/core/validation/password";

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
  const t = useTranslations();
  const locale = useLocale();
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
      options: {
        // emailRedirectTo serves the default Supabase email template; the
        // template in supabase/templates links to /auth/confirm instead.
        emailRedirectTo: authCallbackUrl(),
        captchaToken: captcha.token,
        // Cosmetic: the profile trigger copies it into profiles.locale.
        data: { locale },
      },
    });

    captcha.reset();

    if (error) {
      setError(authErrorMessage(error, t));
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
        title={t("Auth.signUp.sentTitle")}
      >
        {t.rich("Auth.signUp.sent", { email: sentTo, strong: (chunks) => <strong>{chunks}</strong> })}
      </CheckEmail>
    );
  }

  const legalLink = (href: string) => function LegalLink(chunks: ReactNode) {
    return (
      <AppLink
        className="underline"
        href={href}
        target="_blank"
      >
        {chunks}
      </AppLink>
    );
  };

  return (
    <>
      <AuthHeading
        description={t("Auth.signUp.description")}
        title={t("Auth.signUp.title")}
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
          description={passwordHint(t)}
          label={t("Auth.password")}
          name="password"
          validate={(value) => validatePassword(value, t)}
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          autoComplete="new-password"
          label={t("Auth.confirmPassword")}
          name="confirmPassword"
          validate={(value) => (value === password ? null : t("Validation.passwordMismatch"))}
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
              {t.rich("Auth.signUp.terms", { terms: legalLink(routes.termsOfUse), privacy: legalLink(routes.privacyPolicy) })}
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
          {t("Auth.signUp.submit")}
        </Button>
      </Form>
      <p className="text-center text-sm text-muted">
        {t.rich("Auth.signUp.haveAccount", { link: (chunks) => <AppLink href={withNext(routes.signIn, next)}>{chunks}</AppLink> })}
      </p>
    </>
  );
}
