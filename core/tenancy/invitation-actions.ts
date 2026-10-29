"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountRole } from "./roles";

import type { Database } from "@/core/db/database.types";
import { getClaims } from "@/core/auth/session";
import { invitePath } from "@/core/config/routes";
import { absoluteUrl } from "@/core/config/site-url";
import { emailTranslator, savedLocale, sendEmail } from "@/core/email";
import { invitationEmail } from "@/core/email/templates";
import { captureException } from "@/core/errors";
import { requestLocale } from "@/core/i18n/locale";
import { createClient } from "@/core/supabase/server";
import { normalizeEmail } from "@/core/validation/email";


export type CreateInvitationResult =
  | { token: string; emailSent: boolean; error?: undefined }
  /** The create_invitation error, for rpcErrorMessage(). */
  | { error: { code?: string; message: string } };

/**
 * Invites an email to an account: create_invitation runs as the signed-in
 * user (it checks permission, rank and limits), then the link goes out by
 * email in the invitee's language. The token comes back once, so the dialog
 * can show the link too; a failed email only sets emailSent to false.
 *
 * A Server Action rather than an RPC from the browser: sending email needs
 * the provider's secrets.
 */
export async function createInvitation(accountId: string, email: string, role: AccountRole): Promise<CreateInvitationResult> {
  const supabase = await createClient();
  const invitee = normalizeEmail(String(email));
  const { data: token, error } = await supabase.rpc("create_invitation", {
    p_account_id: String(accountId),
    p_email: invitee,
    p_role: role,
  });

  if (error) {
    return { error: { code: error.code, message: error.message } };
  }

  const emailSent = await emailInvitation(supabase, { accountId, email: invitee, role, token });

  return { token, emailSent };
}

async function emailInvitation(
  supabase: SupabaseClient<Database>,
  { accountId, email, role, token }: { accountId: string; email: string; role: AccountRole; token: string }
) {
  try {
    const claims = await getClaims();

    if (!claims) {
      throw new Error("No session after create_invitation");
    }

    // Both readable under RLS: the caller is a member, and their own profile.
    const [account, inviter] = await Promise.all([
      supabase.from("accounts").select("name").eq("id", accountId).single(),
      supabase.from("profiles").select("email, first_name, last_name").eq("id", claims.sub).single(),
    ]);

    if (account.error || inviter.error) {
      throw account.error ?? inviter.error;
    }

    // An invitee who already has a profile reads it in their language; anyone
    // else in the inviter's, the best guess for a colleague.
    const locale = (await savedLocale({ email })) ?? (await requestLocale());
    const { first_name, last_name } = inviter.data;
    // Same rule as private.display_name.
    const inviterName = [first_name, last_name].filter(Boolean).join(" ") || inviter.data.email || "";

    await sendEmail(invitationEmail(await emailTranslator(locale), locale, {
      to: email,
      accountName: account.data.name,
      inviterName,
      role,
      url: absoluteUrl(invitePath(token)),
    }));

    return true;
  } catch (error) {
    captureException(error, { action: "invitationEmail" });

    return false;
  }
}
