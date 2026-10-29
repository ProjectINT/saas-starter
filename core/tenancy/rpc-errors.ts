import type { Messages } from "next-intl";

import type { Translate } from "@/core/i18n/translate";
import { captureException } from "@/core/errors";

type RpcErrorKey = Exclude<keyof Messages["RpcErrors"], "fallback">;

/**
 * Error keys raised by the tenancy RPCs (supabase/schemas/31_members.sql,
 * 32_invitations.sql), with their texts in the RpcErrors namespace. The key
 * is the Postgres error message; check-constraint errors are matched by
 * constraint name.
 */
const RPC_ERROR_KEYS = [
  "not_authenticated",
  "not_allowed",
  "member_not_found",
  "invalid_role",
  "owner_cannot_leave",
  "already_member",
  "invitation_not_found",
  "invitation_closed",
  "invitation_expired",
  "account_invitations_email_format",
  "invitation_limit_reached",
  "account_not_found",
] as const satisfies readonly RpcErrorKey[];

const isRpcErrorKey = (value: string): value is RpcErrorKey => (RPC_ERROR_KEYS as readonly string[]).includes(value);

/** The error key of an RPC error, or null if it is not one of ours. */
export function rpcErrorKey(error: { code?: string; message: string }): RpcErrorKey | null {
  if (isRpcErrorKey(error.message)) {
    return error.message;
  }

  if (error.code === "23514") {
    return RPC_ERROR_KEYS.find((key) => error.message.includes(`"${key}"`)) ?? null;
  }

  return null;
}

/** The text for an RPC error. Errors that are not ours (a bug, an outage) are reported and get a generic text. */
export function rpcErrorMessage(error: { code?: string; message: string }, t: Translate) {
  const key = rpcErrorKey(error);

  if (!key) {
    captureException(error, { source: "rpc" });
  }

  return t(`RpcErrors.${key ?? "fallback"}`);
}
