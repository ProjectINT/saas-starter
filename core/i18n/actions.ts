"use server";

import { cookies } from "next/headers";

import { captureException } from "@/core/errors";
import { getClaims } from "@/core/auth/session";
import { createClient } from "@/core/supabase/server";

import { LOCALE_COOKIE } from "./config";
import { localeCookieOptions, syncProfileLocale } from "./locale";
import { supportedLocale } from "./negotiate";

/**
 * The language switcher: sets the locale cookie and, for a signed-in user,
 * the profile's locale (used for emails and on other devices). The caller
 * refreshes the page to render in the new language.
 */
export async function setLocale(value: string) {
  const locale = supportedLocale(value);

  if (!locale) {
    return;
  }

  (await cookies()).set(LOCALE_COOKIE, locale, localeCookieOptions);

  const claims = await getClaims();

  if (claims) {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ locale }).eq("id", claims.sub);

    if (error) {
      captureException(error, { action: "setLocale" });
    }
  }
}

/** After a password sign-in in the browser (OAuth and email links sync in their Route Handlers). */
export async function syncLocaleAfterSignIn() {
  const claims = await getClaims();

  if (claims) {
    await syncProfileLocale(await createClient(), claims.sub);
  }
}
