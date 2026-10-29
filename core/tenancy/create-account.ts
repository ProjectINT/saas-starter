"use server";

import { redirect } from "next/navigation";

import { accountPath } from "@/core/config/routes";
import { createClient } from "@/core/supabase/server";
import { validateSlug } from "@/core/validation/slug";

import { createAccountErrorState, type CreateAccountState } from "./create-account-errors";

/**
 * Server Action behind the onboarding form: creates an account owned by the
 * signed-in user through the create_account RPC (which also runs the app hook
 * private.app_on_account_created) and opens it.
 */
export async function createAccount(_state: CreateAccountState, formData: FormData): Promise<CreateAccountState> {
  const values = { name: String(formData.get("name") ?? ""), slug: String(formData.get("slug") ?? "") };
  const name = values.name.trim();
  const slug = values.slug.trim().toLowerCase();
  const errors: Record<string, string> = {};

  if (!name || name.length > 100) {
    errors.name = "Enter a name of up to 100 characters.";
  }

  const slugError = validateSlug(slug);

  if (slugError) {
    errors.slug = slugError;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, formError: null, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_account", { p_name: name, p_slug: slug });

  if (error) {
    return createAccountErrorState(error, values);
  }

  redirect(accountPath(data.slug));
}
