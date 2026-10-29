import type { PostgrestError } from "@supabase/supabase-js";
import type { useRouter } from "next/navigation";
import type { ConfigProxy, TranslateFn } from "palistor";

import { toast } from "@heroui/react";
import { Palistor, defineList } from "palistor";

import type { Translate } from "@/core/i18n/translate";
import { invitePath, routes } from "@/core/config/routes";
import { captureException } from "@/core/errors";
import { createClient } from "@/core/supabase/client";
import { normalizeEmail, validateEmail } from "@/core/validation/email";

import { createInvitation } from "./invitation-actions";
import { ACCOUNT_ROLES, byRoleThenName, type AccountRole } from "./roles";
import { rpcErrorKey, rpcErrorMessage } from "./rpc-errors";

// State of the members page: the roster, open invitations, the invite form and
// the member action in progress. Data comes from the browser Supabase client
// (RLS applies); every change is one RPC that checks permission and rank itself.
// Inviting goes through a Server Action, which also emails the link.

/** What MembersView puts into store.context. */
export interface MembersContext {
  accountId: string;
  router: ReturnType<typeof useRouter>;
  /** Root translator from useTranslations(), for toasts and RPC errors. */
  t: Translate;
}

export interface MemberItem {
  /** The member's user id. */
  id: string;
  role: AccountRole;
  /** First and last name, or the email (same rule as private.display_name); empty if neither is known. */
  name: string;
  email: string;
}

export interface InvitationItem {
  id: string;
  email: string;
  role: AccountRole;
  expiresAt: string;
  isExpired: boolean;
}

/** Menu actions on a member or an invitation. remove, transfer and leave ask for confirmation first. */
export type MemberActionType = "" | "role" | "remove" | "transfer" | "leave" | "revoke";

interface InviteValues {
  email: string;
  role: AccountRole;
  /** Errors of the last create_invitation call, shown under their field or above the form. */
  emailError: string;
  roleError: string;
  formError: string;
  /** Path of the created invitation link; the token behind it is not stored, so it is shown only now. */
  link: string;
  /** Whether the link also went out by email. */
  emailSent: boolean;
}

interface ActionValues {
  type: MemberActionType;
  /** User id of the member, or id of the invitation. */
  targetId: string;
  /** Who the action is about, for the confirmation and the toast. */
  targetName: string;
  /** The new role of a "role" action. */
  role: AccountRole;
}

/** The part of the store the actions use (palistor hands the store to onSubmit untyped). */
interface MembersStoreApi {
  /** Set by MembersView on mount, so complete whenever a form is submitted. */
  readonly context: MembersContext;
  readonly proxy: { members: { reload(): void }; invitations: { reload(): void } };
  setValues(patch: { invite?: Partial<InviteValues>; action?: Partial<ActionValues> }): void;
}

const LEAST_ROLE = ACCOUNT_ROLES[ACCOUNT_ROLES.length - 1];

// Empty when a list resolver first runs: MembersView sets it after mount.
const membersContext = (store: { context: Record<string, unknown> }) => store.context as Partial<MembersContext>;

/** The account roster, owner first. RLS returns it only with members.view. */
async function fetchMembers(accountId: string | undefined): Promise<MemberItem[]> {
  // No account until MembersView sets the context (never during SSR).
  if (!accountId) {
    return [];
  }

  const { data, error } = await createClient()
    .from("account_members")
    .select("user_id, role, profile:profiles!account_members_user_id_fkey (email, first_name, last_name)")
    .eq("account_id", accountId);

  if (error) {
    // palistor keeps it in list.error, where the page offers a retry.
    captureException(error, { source: "members" });
    throw error;
  }

  return data
    .map(({ user_id, role, profile }) => ({
      id: user_id,
      role,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "",
      email: profile.email ?? "",
    }))
    .toSorted(byRoleThenName);
}

/** Invitations not yet accepted, declined or revoked (expired ones included). RLS requires members.invite. */
async function fetchOpenInvitations(accountId: string | undefined): Promise<InvitationItem[]> {
  if (!accountId) {
    return [];
  }

  const { data, error } = await createClient()
    .from("account_invitations")
    .select("id, email, role, expires_at")
    .eq("account_id", accountId)
    .is("accepted_at", null)
    .is("declined_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    captureException(error, { source: "invitations" });
    throw error;
  }

  const now = Date.now();

  return data.map(({ id, email, role, expires_at }) => ({
    id,
    email,
    role,
    expiresAt: expires_at,
    isExpired: new Date(expires_at).getTime() <= now,
  }));
}

const INVITE_ERROR_FIELDS: Record<string, "emailError" | "roleError"> = {
  already_member: "emailError",
  account_invitations_email_format: "emailError",
  invalid_role: "roleError",
};

/** Maps a create_invitation error to the field it concerns, or to the whole form. */
export function inviteErrorFields(error: { code?: string; message: string }, t: Translate) {
  const key = rpcErrorKey(error);
  const field = (key && INVITE_ERROR_FIELDS[key]) || "formError";

  return { emailError: "", roleError: "", formError: "", [field]: rpcErrorMessage(error, t) };
}

async function submitInvitation(values: InviteValues, store: MembersStoreApi) {
  const { accountId, t } = store.context;
  let result: Awaited<ReturnType<typeof createInvitation>>;

  try {
    result = await createInvitation(accountId, normalizeEmail(values.email), values.role);
  } catch (error) {
    // The action itself failed (network, deployment change), not the RPC.
    captureException(error, { action: "createInvitation" });
    store.setValues({ invite: { formError: t("RpcErrors.fallback") } });

    return;
  }

  if (result.error) {
    store.setValues({ invite: inviteErrorFields(result.error, t) });

    return;
  }

  store.setValues({ invite: { formError: "", link: invitePath(result.token), emailSent: result.emailSent } });
  store.proxy.invitations.reload();
}

/**
 * Runs the chosen action. On failure the action stays set, so an open
 * confirmation stays open for another try.
 */
async function runMemberAction({ type, targetId, targetName, role }: ActionValues, store: MembersStoreApi) {
  const { accountId, router, t } = store.context;
  const supabase = createClient();
  const failed = (error: PostgrestError | null) => {
    if (error) {
      toast.danger(rpcErrorMessage(error, t));
    }

    return error !== null;
  };

  switch (type) {
    case "role": {
      const { error } = await supabase.rpc("change_member_role", { p_account_id: accountId, p_user_id: targetId, p_role: role });

      if (failed(error)) {
        return;
      }

      toast.success(t("Members.roleChanged", { name: targetName, role: t(`Roles.${role}`) }));
      store.proxy.members.reload();
      break;
    }
    case "remove": {
      const { error } = await supabase.rpc("remove_member", { p_account_id: accountId, p_user_id: targetId });

      if (failed(error)) {
        return;
      }

      toast.success(t("Members.removed", { name: targetName }));
      store.proxy.members.reload();
      break;
    }
    case "transfer": {
      const { error } = await supabase.rpc("transfer_ownership", { p_account_id: accountId, p_new_owner_id: targetId });

      if (failed(error)) {
        return;
      }

      toast.success(t("Members.transferred", { name: targetName }));
      store.proxy.members.reload();
      // The caller's own role changed: re-render the server-side account context.
      router.refresh();
      break;
    }
    case "leave": {
      const { error } = await supabase.rpc("leave_account", { p_account_id: accountId });

      if (failed(error)) {
        return;
      }

      toast.success(t("Members.left", { account: targetName }));
      router.push(routes.accounts);
      break;
    }
    case "revoke": {
      const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: targetId });

      if (failed(error)) {
        return;
      }

      toast.success(t("Members.revoked", { email: targetName }));
      store.proxy.invitations.reload();
      break;
    }
    default:
      return;
  }

  store.setValues({ action: { type: "" } });
}

const membersConfig = () => ({
  members: defineList<MemberItem>({
    template: {
      id: { value: "" },
      role: { value: LEAST_ROLE },
      name: { value: "" },
      email: { value: "" },
    },
    resolve: { resolver: (_values, store) => fetchMembers(membersContext(store).accountId) },
  }),

  invitations: defineList<InvitationItem>({
    template: {
      id: { value: "" },
      email: { value: "" },
      role: { value: LEAST_ROLE },
      expiresAt: { value: "" },
      isExpired: { value: false },
    },
    resolve: { resolver: (_values, store) => fetchOpenInvitations(membersContext(store).accountId) },
  }),

  invite: {
    email: {
      value: "",
      isRequired: true,
      validate: (value: string, values: InviteValues, t: TranslateFn) => values.emailError || validateEmail(value, t) || undefined,
      setter: () => ({ emailError: "" }),
    },
    role: {
      // The least privileged role by default.
      value: LEAST_ROLE,
      isRequired: true,
      validate: (_value: AccountRole, values: InviteValues) => values.roleError || undefined,
      setter: () => ({ roleError: "" }),
    },
    emailError: { value: "" },
    roleError: { value: "" },
    formError: { value: "" },
    link: { value: "" },
    emailSent: { value: false },
    onSubmit: submitInvitation,
  },

  action: {
    type: { value: "" as MemberActionType },
    targetId: { value: "" },
    targetName: { value: "" },
    role: { value: LEAST_ROLE },
    onSubmit: runMemberAction,
  },
});

/** One store per members page (created on mount, so nothing is shared between requests or accounts). */
export const createMembersStore = () => new Palistor({ config: membersConfig() });

export type MembersForm = ConfigProxy<ReturnType<typeof membersConfig>>;
