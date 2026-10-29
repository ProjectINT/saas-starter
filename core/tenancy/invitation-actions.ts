"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { accountPath, invitePath, routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/server";

import { inviteErrorState, type InviteState } from "./invite-state";
import { isAccountRole } from "./roles";
import { rpcErrorMessage } from "./rpc-errors";

/**
 * Invite form (bind the account id). Returns the link path to hand to the
 * invitee; the token behind it is not stored, so it cannot be shown again.
 */
export async function createInvitation(accountId: string, _state: InviteState, formData: FormData): Promise<InviteState> {
  const values = { email: String(formData.get("email") ?? ""), role: String(formData.get("role") ?? "") };

  if (!isAccountRole(values.role)) {
    return inviteErrorState({ message: "invalid_role" }, values);
  }

  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invitation", {
    p_account_id: accountId,
    p_email: values.email,
    p_role: values.role,
  });

  if (error) {
    return inviteErrorState(error, values);
  }

  refresh();

  return { errors: {}, formError: null, values, invitePath: invitePath(token) };
}

/** Joins the account and opens it. */
export async function acceptInvitation(invitationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_invitation_id: invitationId });

  if (error) {
    return rpcErrorMessage(error);
  }

  redirect(accountPath(data.slug));
}

/** Declines and returns to the account list (which routes on if nothing is left to choose). */
export async function declineInvitation(invitationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_invitation", { p_invitation_id: invitationId });

  if (error) {
    return rpcErrorMessage(error);
  }

  redirect(routes.accounts);
}
