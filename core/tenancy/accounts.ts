import "server-only";

import type { Permission } from "./permissions.generated";
import type { AccountRole } from "./roles";

import { cache } from "react";

import { requireClaims } from "@/core/auth/session";
import { createClient } from "@/core/supabase/server";

export interface Membership {
  role: AccountRole;
  account: { id: string; slug: string; name: string; owner_id: string };
}

/** The signed-in user inside one account: who they are there and what they may do. */
export interface AccountContext extends Membership {
  userId: string;
  permissions: Permission[];
}

/**
 * Active accounts of the signed-in user, by name. Deactivated accounts drop
 * out: RLS hides them, and the inner join removes their membership rows.
 */
export const listMyAccounts = cache(async (): Promise<Membership[]> => {
  const claims = await requireClaims();
  const supabase = await createClient();
  // RLS also returns co-members of accounts with members.view, so filter to own rows.
  const { data, error } = await supabase
    .from("account_members")
    .select("role, account:accounts!inner (id, slug, name, owner_id)")
    .eq("user_id", claims.sub);

  if (error) {
    throw error;
  }

  return data.toSorted((a, b) => a.account.name.localeCompare(b.account.name));
});

/** Permissions of a role, read from public.role_permissions (the matrix RLS checks). */
export const getRolePermissions = cache(async (role: AccountRole) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("role_permissions").select("permission").eq("role", role);

  if (error) {
    throw error;
  }

  return data.map((row) => row.permission as Permission);
});

/**
 * The signed-in user's membership in the account behind a URL slug, or null
 * if they are not a member (or the account is deactivated).
 */
export const getAccountContext = cache(async (slug: string): Promise<AccountContext | null> => {
  const [claims, memberships] = await Promise.all([requireClaims(), listMyAccounts()]);
  const membership = memberships.find((item) => item.account.slug === slug);

  if (!membership) {
    return null;
  }

  return { ...membership, userId: claims.sub, permissions: await getRolePermissions(membership.role) };
});

/** Server-side `can`: a UI hint only, the database checks every write again. */
export const can = (context: Pick<AccountContext, "permissions">, permission: Permission) =>
  context.permissions.includes(permission);

/** Pending invitations addressed to the signed-in user's confirmed email. */
export const listMyInvitations = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_invitations");

  if (error) {
    throw error;
  }

  return data;
});
