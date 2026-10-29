import "server-only";

import { cache } from "react";

import { createClient } from "@/core/supabase/server";

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

/** The invitation behind a link token (see public.get_invitation), or null. */
export const getInvitation = cache(async (token: string) => {
  // Not a token create_invitation could have produced: skip the round trip.
  if (!TOKEN_FORMAT.test(token)) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation", { p_token: token }).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
});
