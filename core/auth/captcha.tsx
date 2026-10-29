"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

import { publicEnv } from "@/core/config/public-env";

// Optional captcha for Supabase Auth. The widget yields a one-time token that
// is passed as `options.captchaToken` to signUp / signInWithPassword /
// resetPasswordForEmail / resend; Supabase Auth verifies it with the provider,
// so it cannot be skipped by calling the Auth API directly.

const provider = publicEnv.NEXT_PUBLIC_CAPTCHA_PROVIDER;
const siteKey = publicEnv.NEXT_PUBLIC_CAPTCHA_SITE_KEY;

/** True when NEXT_PUBLIC_CAPTCHA_PROVIDER is set. */
export const isCaptchaEnabled = Boolean(provider && siteKey);

// Turnstile and hCaptcha share the same explicit-render API.
interface CaptchaApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: CaptchaApi;
    hcaptcha?: CaptchaApi;
  }
}

const SCRIPTS = {
  turnstile: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  hcaptcha: "https://js.hcaptcha.com/1/api.js?render=explicit",
};

let scriptPromise: Promise<CaptchaApi> | null = null;

function loadCaptchaApi(name: keyof typeof SCRIPTS) {
  scriptPromise ??= new Promise<CaptchaApi>((resolve, reject) => {
    const script = document.createElement("script");

    script.src = SCRIPTS[name];
    script.async = true;
    script.onload = () => {
      const api = window[name];

      if (api) {
        resolve(api);
      } else {
        reject(new Error(`${name} did not load`));
      }
    };
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error(`${name} did not load`));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export interface CaptchaHandle {
  /** Tokens are single-use: reset after every Auth call, successful or not. */
  reset(): void;
}

interface CaptchaProps {
  ref?: Ref<CaptchaHandle>;
  onToken: (token: string | null) => void;
}

export function Captcha({ ref, onToken }: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ api: CaptchaApi; id: string } | null>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);
  const t = useTranslations("Auth");
  // Read once: the widget is rendered on mount and keeps its language.
  const locale = useLocale();

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current(null);

      if (widgetRef.current) {
        widgetRef.current.api.reset(widgetRef.current.id);
      }
    },
  }), []);

  useEffect(() => {
    if (!provider || !siteKey) {
      return;
    }

    let cancelled = false;

    loadCaptchaApi(provider)
      .then((api) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        widgetRef.current = {
          api,
          id: api.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onTokenRef.current(token),
            "expired-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
            // Turnstile and hCaptcha name the widget language differently.
            ...(provider === "turnstile" ? { language: locale } : { hl: locale }),
          }),
        };
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;

      if (widgetRef.current) {
        widgetRef.current.api.remove(widgetRef.current.id);
        widgetRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new language applies on the next page load
  }, []);

  if (failed) {
    return <p className="text-sm text-danger">{t("captchaFailed")}</p>;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[65px]"
    />
  );
}

/**
 * Captcha state for a form: render `widget`, send `token` with the Auth call,
 * then call `reset()`. Without a configured provider the widget is null,
 * the token is undefined and `isReady` is always true.
 */
export function useCaptcha() {
  const ref = useRef<CaptchaHandle>(null);
  const [token, setToken] = useState<string | null>(null);

  return {
    token: token ?? undefined,
    isReady: !isCaptchaEnabled || token !== null,
    widget: isCaptchaEnabled ? (
      <Captcha
        ref={ref}
        onToken={setToken}
      />
    ) : null,
    reset: () => ref.current?.reset(),
  };
}
