/**
 * Messages for the error keys raised by the tenancy RPCs
 * (supabase/schemas/31_members.sql, 32_invitations.sql). The key is the
 * Postgres error message; check-constraint errors are matched by constraint
 * name.
 */
const RPC_ERRORS: Record<string, string> = {
  not_authenticated: "Your session has ended. Sign in again.",
  not_allowed: "You don't have permission to do that.",
  member_not_found: "This person is not a member of the account.",
  invalid_role: "This role can't be given.",
  owner_cannot_leave: "The owner can't leave the account. Transfer ownership first.",
  already_member: "This person is already a member.",
  invitation_not_found: "This invitation doesn't exist or is addressed to another email.",
  invitation_closed: "This invitation has already been used or withdrawn.",
  invitation_expired: "This invitation has expired. Ask for a new one.",
  account_invitations_email_format: "Enter a valid email address.",
};

const FALLBACK = "Something went wrong. Try again.";

/** The error key of an RPC error, or null if it is not one of ours. */
export function rpcErrorKey(error: { code?: string; message: string }) {
  if (Object.hasOwn(RPC_ERRORS, error.message)) {
    return error.message;
  }

  if (error.code === "23514") {
    return Object.keys(RPC_ERRORS).find((key) => error.message.includes(`"${key}"`)) ?? null;
  }

  return null;
}

export function rpcErrorMessage(error: { code?: string; message: string }) {
  const key = rpcErrorKey(error);

  return key ? RPC_ERRORS[key] : FALLBACK;
}
