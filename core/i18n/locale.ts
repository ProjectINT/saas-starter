import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { cookies, headers } from "next/headers";

import { captureException } from "@/core/errors";
import type { Database } from "@/core/db/database.types";

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";
import { negotiateLocale, supportedLocale } from "./negotiate";

export const localeCookieOptions = { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" } as const;

/** The UI language of this request: the locale cookie, else the browser's Accept-Language. */
export async function requestLocale(): Promise<Locale> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);

  return supportedLocale(cookieStore.get(LOCALE_COOKIE)?.value) ?? negotiateLocale(requestHeaders.get("accept-language"));
}

/**
 * Right after sign-in: a locale saved in the profile becomes the cookie (a new
 * device opens in the user's language); a profile without one gets the
 * current locale, so emails to the user have a language. Call it from code
 * that may set cookies (Route Handlers, Server Actions). Never fails the
 * sign-in: errors are only reported.
 */
export async function syncProfileLocale(supabase: SupabaseClient<Database>, userId: string) {
  const [{ data, error }, cookieStore] = await Promise.all([
    supabase.from("profiles").select("locale").eq("id", userId).maybeSingle(),
    cookies(),
  ]);

  if (error || !data) {
    captureException(error ?? new Error("Profile not found"), { action: "syncProfileLocale" });

    return;
  }

  const saved = supportedLocale(data.locale);

  if (saved) {
    cookieStore.set(LOCALE_COOKIE, saved, localeCookieOptions);
  } else if (!data.locale) {
    // An unsupported saved locale (e.g. one the app dropped) is left as is.
    const { error: updateError } = await supabase.from("profiles").update({ locale: await requestLocale() }).eq("id", userId);

    if (updateError) {
      captureException(updateError, { action: "syncProfileLocale" });
    }
  }
}
