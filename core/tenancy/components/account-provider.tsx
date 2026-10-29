"use client";

import type { AccountContext } from "../accounts";
import type { Permission } from "../permissions.generated";

import { createContext, use, useEffect, type ReactNode } from "react";

import { LAST_ACCOUNT_COOKIE, LAST_ACCOUNT_MAX_AGE } from "../last-account";

const CurrentAccount = createContext<AccountContext | null>(null);

/**
 * Hands the current account, the user's role and permissions to client
 * components (see useAccount) and remembers the account as the last opened.
 */
export function AccountProvider({ value, children }: { value: AccountContext; children: ReactNode }) {
  const slug = value.account.slug;

  useEffect(() => {
    const secure = window.location.protocol === "https:" ? "; secure" : "";

    document.cookie = `${LAST_ACCOUNT_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${LAST_ACCOUNT_MAX_AGE}; samesite=lax${secure}`;
  }, [slug]);

  return <CurrentAccount value={value}>{children}</CurrentAccount>;
}

/**
 * The account of the current page. `can()` hides controls the user may not
 * use; the database checks every write again, so it is never the guard.
 */
export function useAccount() {
  const context = use(CurrentAccount);

  if (!context) {
    throw new Error("useAccount() is available only inside app/(app)/[account]");
  }

  return { ...context, can: (permission: Permission) => context.permissions.includes(permission) };
}
