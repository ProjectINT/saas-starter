"use client";

import type { ReactNode } from "react";

import { Envelope } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useState } from "react";

import { useCaptcha } from "@/core/auth/captcha";
import { authErrorMessage } from "@/core/auth/errors";
import { authCallbackUrl } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { ButtonLink } from "@/core/ui/links";
import { Notice } from "@/core/ui/notice";

import { AuthHeading } from "./auth-heading";

interface CheckEmailProps {
  email: string;
  title: string;
  children: ReactNode;
  /** Replaces the "Back to sign in" link, for forms that render this screen in place. */
  onBack?: () => void;
}

/** "Open the link we sent" screen with a resend button for the sign-up confirmation email. */
export function CheckEmail({ email, title, children, onBack }: CheckEmailProps) {
  const captcha = useCaptcha();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setStatus("sending");
    setError(null);

    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authCallbackUrl(), captchaToken: captcha.token },
    });

    captcha.reset();

    if (error) {
      setError(authErrorMessage(error));
      setStatus("idle");

      return;
    }

    setStatus("sent");
  }

  return (
    <>
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Envelope className="size-6" />
      </div>
      <AuthHeading
        description={children}
        title={title}
      />
      {error && <Notice>{error}</Notice>}
      {status === "sent" && <Notice status="success">A new link is on its way to {email}.</Notice>}
      {captcha.widget}
      <div className="flex flex-col gap-2">
        <Button
          fullWidth
          isDisabled={!captcha.isReady}
          isPending={status === "sending"}
          variant="secondary"
          onPress={resend}
        >
          Resend email
        </Button>
        {onBack ? (
          <Button
            fullWidth
            variant="ghost"
            onPress={onBack}
          >
            Back to sign in
          </Button>
        ) : (
          <ButtonLink
            fullWidth
            href={routes.signIn}
            variant="ghost"
          >
            Back to sign in
          </ButtonLink>
        )}
      </div>
    </>
  );
}
