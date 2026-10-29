import { rpcErrorKey, rpcErrorMessage } from "./rpc-errors";

export interface InviteState {
  /** Field errors by input name, for HeroUI Form `validationErrors`. */
  errors: Record<string, string>;
  formError: string | null;
  /** Submitted values the errors refer to. */
  values: Record<string, string>;
  /** Path of the invitation link (/invite/<token>) once created. The token is shown only now. */
  invitePath: string | null;
}

export const initialInviteState: InviteState = { errors: {}, formError: null, values: {}, invitePath: null };

const FIELD_BY_ERROR: Record<string, string> = {
  already_member: "email",
  account_invitations_email_format: "email",
  invalid_role: "role",
};

/** Maps a create_invitation error to form state: under the field it concerns, or above the form. */
export function inviteErrorState(error: { code?: string; message: string }, values: Record<string, string>): InviteState {
  const key = rpcErrorKey(error);
  const field = key ? FIELD_BY_ERROR[key] : undefined;

  if (field) {
    return { errors: { [field]: rpcErrorMessage(error) }, formError: null, values, invitePath: null };
  }

  return { errors: {}, formError: rpcErrorMessage(error), values, invitePath: null };
}
