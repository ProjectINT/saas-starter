"use client";

import type { AuthError } from "@supabase/supabase-js";

import { Button, Form } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { captureException } from "@/core/errors";
import type { OAuthProvider } from "@/core/auth/oauth";
import { useCaptcha } from "@/core/auth/captcha";
import { authErrorMessage } from "@/core/auth/errors";
import { withNext } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { syncLocaleAfterSignIn } from "@/core/i18n/actions";
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
  const t = useTranslations();
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

    // The profile's language becomes this device's, before the next page renders.
    await syncLocaleAfterSignIn().catch((syncError: unknown) => captureException(syncError, { action: "syncLocaleAfterSignIn" }));
    // Stay pending until the next page renders; refresh drops RSC payloads cached while signed out.
    router.replace(next);
    router.refresh();
  }

  if (error?.code === "email_not_confirmed") {
    return (
      <CheckEmail
        email={email}
        title={t("Auth.signIn.notConfirmedTitle")}
        onBack={() => setError(null)}
      >
        {t.rich("Auth.signIn.notConfirmed", { email, strong: (chunks) => <strong>{chunks}</strong> })}
      </CheckEmail>
    );
  }

  return (
    <>
      <AuthHeading
        description={t("Auth.signIn.description")}
        title={t("Auth.signIn.title")}
      />
      <SocialButtons
        next={next}
        providers={providers}
      />
      <Form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        {error && <Notice>{authErrorMessage(error, t)}</Notice>}
        <EmailField
          autoFocus
          defaultValue={email}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            autoComplete="current-password"
            label={t("Auth.password")}
            name="password"
          />
          <AppLink
            className="self-end text-sm"
            href={routes.forgotPassword}
          >
            {t("Auth.signIn.forgotPassword")}
          </AppLink>
        </div>
        {captcha.widget}
        <Button
          fullWidth
          isDisabled={!captcha.isReady}
          isPending={isPending}
          type="submit"
        >
          {t("Auth.signIn.submit")}
        </Button>
      </Form>
      <p className="text-center text-sm text-muted">
        {t.rich("Auth.signIn.noAccount", { link: (chunks) => <AppLink href={withNext(routes.signUp, next)}>{chunks}</AppLink> })}
      </p>
    </>
  );
}
