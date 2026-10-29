import "server-only";

import { cache } from "react";

import type { Database } from "@/core/db/database.types";
import { requireClaims } from "@/core/auth/session";
import { createClient } from "@/core/supabase/server";

export type AccountRole = Database["public"]["Enums"]["account_role"];

export interface Membership {
  role: AccountRole;
  account: { id: string; slug: string; name: string };
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
    .select("role, account:accounts!inner (id, slug, name)")
    .eq("user_id", claims.sub);

  if (error) {
    throw error;
  }

  return data.toSorted((a, b) => a.account.name.localeCompare(b.account.name));
});

/** The account behind a URL slug if the signed-in user is a member, else null. */
export const getAccountBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("id, slug, name").eq("slug", slug).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
});
