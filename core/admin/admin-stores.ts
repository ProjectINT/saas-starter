import type { useRouter } from "next/navigation";
import type { ConfigProxy } from "palistor";

import { toast } from "@heroui/react";
import { Palistor, defineList } from "palistor";

import type { Translate } from "@/core/i18n/translate";
import { captureException } from "@/core/errors";
import { createClient } from "@/core/supabase/client";
import { rpcErrorMessage } from "@/core/tenancy/rpc-errors";

import { setUserBlocked } from "./actions";

// The two lists of /admin: accounts and users. Each page has one store: a
// search and page (`query`), the rows of the current page (`items`, loaded
// through the admin RPCs, which refuse anyone but platform admins) and the
// row action in progress (`action`).

export const ADMIN_PAGE_SIZE = 25;

/** What the admin views put into store.context. */
export interface AdminContext {
  router: ReturnType<typeof useRouter>;
  t: Translate;
}

interface QueryValues {
  /** What is typed in the search field. */
  search: string;
  /** The search the rows were loaded for: set on submit, so typing does not refetch. */
  appliedSearch: string;
  page: number;
}

interface ActionValues {
  targetId: string;
  targetName: string;
  /** true: reactivate / unblock; false: deactivate / block. */
  enable: boolean;
  /** The confirmation dialog is open. */
  isOpen: boolean;
}

interface AdminStoreApi {
  readonly context: AdminContext;
  readonly proxy: { items: { reload(): void } };
  setValues(patch: { query?: Partial<QueryValues>; action?: Partial<ActionValues> }): void;
}

export interface AdminAccountItem {
  id: string;
  slug: string;
  name: string;
  ownerEmail: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  /** Matches of the whole search, the same on every row. */
  total: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  accountCount: number;
  isPlatformAdmin: boolean;
  isConfirmed: boolean;
  isBlocked: boolean;
  lastSignInAt: string;
  createdAt: string;
  total: number;
}

type StoreValues = { query?: Partial<QueryValues> };

const pageOf = (values: StoreValues) => ({
  search: values.query?.appliedSearch || null,
  offset: (values.query?.page ?? 0) * ADMIN_PAGE_SIZE,
});

/**
 * Loads the page the query asks for. A search or page change during a load
 * joins that load (palistor deduplicates reloads), so it loads again until
 * the rows match the query. Nothing is fetched before the views set the
 * context, i.e. never during SSR (the browser client has no session there).
 */
async function loadPage<T>(values: StoreValues, store: { context: Record<string, unknown> }, fetchPage: (page: ReturnType<typeof pageOf>) => Promise<T[]>) {
  if (!store.context.router) {
    return [];
  }

  for (;;) {
    const page = pageOf(values);
    const rows = await fetchPage(page);
    const current = pageOf(values);

    if (current.search === page.search && current.offset === page.offset) {
      return rows;
    }
  }
}

async function fetchAccounts({ search, offset }: ReturnType<typeof pageOf>): Promise<AdminAccountItem[]> {
  const { data, error } = await createClient().rpc("admin_list_accounts", { p_search: search ?? undefined, p_limit: ADMIN_PAGE_SIZE, p_offset: offset });

  if (error) {
    captureException(error, { source: "admin_list_accounts" });
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerEmail: row.owner_email ?? "",
    memberCount: Number(row.member_count),
    isActive: row.deactivated_at === null,
    createdAt: row.created_at,
    total: Number(row.total_count),
  }));
}

async function fetchUsers({ search, offset }: ReturnType<typeof pageOf>): Promise<AdminUserItem[]> {
  const { data, error } = await createClient().rpc("admin_list_users", { p_search: search ?? undefined, p_limit: ADMIN_PAGE_SIZE, p_offset: offset });

  if (error) {
    captureException(error, { source: "admin_list_users" });
    throw error;
  }

  const now = Date.now();

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name ?? "",
    accountCount: Number(row.account_count),
    isPlatformAdmin: row.is_platform_admin,
    isConfirmed: row.email_confirmed,
    isBlocked: row.banned_until !== null && new Date(row.banned_until).getTime() > now,
    lastSignInAt: row.last_sign_in_at ?? "",
    createdAt: row.created_at,
    total: Number(row.total_count),
  }));
}

async function applySearch(values: QueryValues, store: AdminStoreApi) {
  store.setValues({ query: { appliedSearch: values.search.trim(), page: 0 } });
  store.proxy.items.reload();
}

/** Turns a page: called from the pager, not a form. */
export function goToPage(store: Pick<AdminStoreApi, "proxy" | "setValues">, page: number) {
  store.setValues({ query: { page: Math.max(0, page) } });
  store.proxy.items.reload();
}

async function setAccountActive({ targetId, targetName, enable }: ActionValues, store: AdminStoreApi) {
  const { t } = store.context;
  const { error } = await createClient().rpc("admin_set_account_active", { p_account_id: targetId, p_active: enable });

  if (error) {
    toast.danger(rpcErrorMessage(error, t));

    return;
  }

  toast.success(enable ? t("Admin.accounts.reactivated", { account: targetName }) : t("Admin.accounts.deactivatedToast", { account: targetName }));
  store.setValues({ action: { isOpen: false } });
  store.proxy.items.reload();
}

async function setBlocked({ targetId, targetName, enable }: ActionValues, store: AdminStoreApi) {
  const { t } = store.context;
  let result: Awaited<ReturnType<typeof setUserBlocked>>;

  try {
    result = await setUserBlocked(targetId, !enable);
  } catch (error) {
    captureException(error, { action: "setUserBlocked" });
    result = { error: "failed" };
  }

  if (result.error) {
    toast.danger(result.error === "self" ? t("Admin.users.cannotBlockSelf") : t(`RpcErrors.${result.error === "failed" ? "fallback" : result.error}`));

    return;
  }

  toast.success(enable ? t("Admin.users.unblockedToast", { email: targetName }) : t("Admin.users.blockedToast", { email: targetName }));
  store.setValues({ action: { isOpen: false } });
  store.proxy.items.reload();
}

const queryGroup = () => ({
  search: { value: "" },
  appliedSearch: { value: "" },
  page: { value: 0 },
  onSubmit: applySearch,
});

const actionGroup = (onSubmit: (values: ActionValues, store: AdminStoreApi) => Promise<void>) => ({
  targetId: { value: "" },
  targetName: { value: "" },
  enable: { value: false },
  isOpen: { value: false },
  onSubmit,
});

const accountsConfig = () => ({
  query: queryGroup(),
  items: defineList<AdminAccountItem>({
    template: {
      id: { value: "" },
      slug: { value: "" },
      name: { value: "" },
      ownerEmail: { value: "" },
      memberCount: { value: 0 },
      isActive: { value: true },
      createdAt: { value: "" },
      total: { value: 0 },
    },
    resolve: { resolver: (values, store) => loadPage(values, store, fetchAccounts) },
  }),
  action: actionGroup(setAccountActive),
});

const usersConfig = () => ({
  query: queryGroup(),
  items: defineList<AdminUserItem>({
    template: {
      id: { value: "" },
      email: { value: "" },
      name: { value: "" },
      accountCount: { value: 0 },
      isPlatformAdmin: { value: false },
      isConfirmed: { value: false },
      isBlocked: { value: false },
      lastSignInAt: { value: "" },
      createdAt: { value: "" },
      total: { value: 0 },
    },
    resolve: { resolver: (values, store) => loadPage(values, store, fetchUsers) },
  }),
  action: actionGroup(setBlocked),
});

/** One store per admin page, created on mount. */
export const createAdminAccountsStore = () => new Palistor({ config: accountsConfig() });

export const createAdminUsersStore = () => new Palistor({ config: usersConfig() });

export type AdminAccountsForm = ConfigProxy<ReturnType<typeof accountsConfig>>;

export type AdminUsersForm = ConfigProxy<ReturnType<typeof usersConfig>>;
