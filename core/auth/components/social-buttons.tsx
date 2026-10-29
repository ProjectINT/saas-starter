"use client";

import type { ReactNode } from "react";

import { LogoGithub } from "@gravity-ui/icons";
import { Button, Separator, toast } from "@heroui/react";
import { useState } from "react";

import type { OAuthProvider } from "@/core/auth/oauth";
import { authErrorMessage } from "@/core/auth/errors";
import { authCallbackUrl } from "@/core/auth/redirect";
import { createClient } from "@/core/supabase/client";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}

const PROVIDERS: Record<OAuthProvider, { label: string; icon: ReactNode }> = {
  google: { label: "Google", icon: <GoogleIcon className="size-5" /> },
  github: { label: "GitHub", icon: <LogoGithub className="size-5" /> },
};

interface SocialButtonsProps {
  /** Providers enabled in Supabase Auth (see getEnabledOAuthProviders). */
  providers: OAuthProvider[];
  /** Where to land after the OAuth round trip. */
  next: string;
}

/**
 * OAuth buttons. The provider redirects back to /auth/callback, which
 * exchanges the code for a session; accounts are resolved afterwards on
 * /accounts, so nothing waits for database triggers.
 */
export function SocialButtons({ providers, next }: SocialButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  if (providers.length === 0) {
    return null;
  }

  async function signInWith(provider: OAuthProvider) {
    setPending(provider);

    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authCallbackUrl(next),
        // Let users with several Google accounts pick one instead of reusing the last.
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });

    // On success the browser is already leaving the page.
    if (error) {
      toast.danger(authErrorMessage(error));
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <Button
            key={provider}
            fullWidth
            isDisabled={pending !== null && pending !== provider}
            isPending={pending === provider}
            variant="tertiary"
            onPress={() => signInWith(provider)}
          >
            {PROVIDERS[provider].icon}
            Continue with {PROVIDERS[provider].label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted">or</span>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}
