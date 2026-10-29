"use server";

import { getClaims } from "@/core/auth/session";
import { captureException } from "@/core/errors";
import { createAdminClient } from "@/core/supabase/admin";
import { createClient } from "@/core/supabase/server";

/** Long enough to mean "until unblocked" (Auth takes a Go duration). */
const BLOCKED_FOR = "876000h";

export type SetUserBlockedResult =
  | { error?: undefined }
  | { error: "not_authenticated" | "not_allowed" | "self" | "failed" };

/**
 * Blocks or unblocks sign-in for a user (Auth ban). Platform admins only: the
 * database answers that (public.is_platform_admin) before the admin client is
 * touched. A blocked user keeps their access token until it expires (an hour
 * at most) but cannot refresh it or sign in again.
 */
export async function setUserBlocked(userId: string, blocked: boolean): Promise<SetUserBlockedResult> {
  const claims = await getClaims();

  if (!claims) {
    return { error: "not_authenticated" };
  }

  const { data: isAdmin, error } = await (await createClient()).rpc("is_platform_admin");

  if (error) {
    captureException(error, { action: "setUserBlocked" });

    return { error: "failed" };
  }

  if (!isAdmin) {
    return { error: "not_allowed" };
  }

  // Blocking oneself would lock the last admin out.
  if (String(userId) === claims.sub) {
    return { error: "self" };
  }

  const { error: banError } = await createAdminClient().auth.admin.updateUserById(String(userId), {
    ban_duration: blocked ? BLOCKED_FOR : "none",
  });

  if (banError) {
    captureException(banError, { action: "setUserBlocked" });

    return { error: "failed" };
  }

  return {};
}
