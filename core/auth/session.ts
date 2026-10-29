import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/server";

/**
 * Claims of the signed-in user, or null. Verified locally against the
 * project's signing keys (no Auth round trip) and cached per request, so
 * layouts and pages can all call it.
 */
export const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return data?.claims ?? null;
});

/**
 * Claims of the signed-in user; redirects to sign-in otherwise. proxy.ts
 * already guards non-public routes; this keeps pages safe on their own.
 */
export async function requireClaims() {
  const claims = await getClaims();

  if (!claims) {
    redirect(routes.signIn);
  }

  return claims;
}
