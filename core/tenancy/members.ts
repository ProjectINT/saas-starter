import "server-only";

import { cache } from "react";

import { createClient } from "@/core/supabase/server";

import { byRoleThenName, type AccountRole } from "./roles";

export interface MemberItem {
  userId: string;
  role: AccountRole;
  /** First and last name, or the email (same rule as private.display_name). */
  name: string;
  email: string | null;
}

/** The account roster, owner first. RLS returns it only with members.view. */
export const listMembers = cache(async (accountId: string): Promise<MemberItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_members")
    .select("user_id, role, profile:profiles!account_members_user_id_fkey (email, first_name, last_name)")
    .eq("account_id", accountId);

  if (error) {
    throw error;
  }

  return data
    .map(({ user_id, role, profile }) => ({
      userId: user_id,
      role,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Unknown user",
      email: profile.email,
    }))
    .toSorted(byRoleThenName);
});

/** Invitations not yet accepted, declined or revoked (expired ones included). RLS requires members.invite. */
export const listOpenInvitations = cache(async (accountId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_invitations")
    .select("id, email, role, expires_at")
    .eq("account_id", accountId)
    .is("accepted_at", null)
    .is("declined_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const now = Date.now();

  return data.map((invitation) => ({ ...invitation, isExpired: new Date(invitation.expires_at).getTime() <= now }));
});

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
