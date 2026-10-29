import { Constants, type Database } from "@/core/db/database.types";

export type AccountRole = Database["public"]["Enums"]["account_role"];

/** All roles in privilege order, most privileged first (the enum declaration order). */
export const ACCOUNT_ROLES: readonly AccountRole[] = Constants.public.Enums.account_role;

export const ROLE_LABELS: Record<AccountRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const rank = (role: AccountRole) => ACCOUNT_ROLES.indexOf(role);

/** True if `role` is strictly more privileged than `other`. */
export const outranks = (role: AccountRole, other: AccountRole) => rank(role) < rank(other);

/**
 * Roles a member with `role` may give through an invitation or a role change:
 * not above their own, never owner (ownership is transferred). Mirrors
 * private.create_invitation and private.change_member_role.
 */
export const assignableRoles = (role: AccountRole) =>
  ACCOUNT_ROLES.filter((candidate) => candidate !== "owner" && rank(candidate) >= rank(role));

export const isAccountRole = (value: unknown): value is AccountRole =>
  typeof value === "string" && (ACCOUNT_ROLES as readonly string[]).includes(value);

/** Sorts members by role (owner first), then by the given name. */
export const byRoleThenName = <T extends { role: AccountRole; name: string }>(a: T, b: T) =>
  rank(a.role) - rank(b.role) || a.name.localeCompare(b.name);
