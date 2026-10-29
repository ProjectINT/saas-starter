"use server";

import type { PostgrestError } from "@supabase/supabase-js";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/server";

import { isAccountRole } from "./roles";
import { rpcErrorMessage } from "./rpc-errors";

// Server Actions behind the members page. Arguments come from the browser and
// are untrusted: every RPC checks the caller's permission and rank itself.
// Each action returns null on success or a message for the user.

export async function changeMemberRole(accountId: string, userId: string, role: string) {
  if (!isAccountRole(role)) {
    return rpcErrorMessage({ message: "invalid_role" });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_member_role", { p_account_id: accountId, p_user_id: userId, p_role: role });

  return settle(error);
}

export async function removeMember(accountId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_account_id: accountId, p_user_id: userId });

  return settle(error);
}

export async function transferOwnership(accountId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", { p_account_id: accountId, p_new_owner_id: userId });

  return settle(error);
}

export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: invitationId });

  return settle(error);
}

/** Leaves the account and returns to the account list. */
export async function leaveAccount(accountId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_account", { p_account_id: accountId });

  if (error) {
    return rpcErrorMessage(error);
  }

  redirect(routes.accounts);
}

/** On success re-renders the current page with fresh server data. */
function settle(error: PostgrestError | null) {
  if (error) {
    return rpcErrorMessage(error);
  }

  refresh();

  return null;
}
