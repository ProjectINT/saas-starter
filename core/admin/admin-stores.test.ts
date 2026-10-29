import { beforeEach, describe, expect, it, vi } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { createAdminAccountsStore, createAdminUsersStore, goToPage } from "./admin-stores";

const supabase = vi.hoisted(() => ({ rpc: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn() }));
const setUserBlocked = vi.hoisted(() => vi.fn());

vi.mock("@/core/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@heroui/react", () => ({ toast }));
vi.mock("./actions", () => ({ setUserBlocked }));

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const accountRow = { id: "acc-1", slug: "acme", name: "Acme", owner_email: "a@example.com", member_count: 3, deactivated_at: null, created_at: "2026-10-01T00:00:00Z", total_count: 60 };

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rpc.mockImplementation((name: string) => Promise.resolve(
    name === "admin_list_accounts" ? { data: [accountRow], error: null } : { data: null, error: null }
  ));
});

function accounts() {
  const store = createAdminAccountsStore();

  store.setContext({ router, t: englishT });

  return store;
}

describe("admin accounts", () => {
  it("does not query before the context is set (no fetch during SSR)", async () => {
    const store = createAdminAccountsStore();

    void store.proxy.items.items;
    await settle();

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("applies a search submitted while the first page is still loading", async () => {
    let release: () => void = () => {};

    supabase.rpc.mockImplementationOnce(() => new Promise((resolve) => {
      release = () => resolve({ data: [accountRow], error: null });
    }));

    const store = accounts();
    const { items, query } = store.proxy;

    void items.items;
    await settle();
    query.search.value = "beta";
    void query.submit();
    await settle();
    release();
    await settle();
    await settle();

    expect(supabase.rpc).toHaveBeenLastCalledWith("admin_list_accounts", { p_search: "beta", p_limit: 25, p_offset: 0 });
  });

  it("loads the first page, then the search and the next pages", async () => {
    const store = accounts();
    const { items, query } = store.proxy;

    void items.items;
    await settle();
    expect(supabase.rpc).toHaveBeenLastCalledWith("admin_list_accounts", { p_search: undefined, p_limit: 25, p_offset: 0 });
    expect(items.getValues()).toEqual([expect.objectContaining({ slug: "acme", memberCount: 3, isActive: true, total: 60 })]);

    query.search.value = "  acme ";
    await query.submit();
    await settle();
    expect(supabase.rpc).toHaveBeenLastCalledWith("admin_list_accounts", { p_search: "acme", p_limit: 25, p_offset: 0 });

    goToPage(store, 2);
    await settle();
    expect(supabase.rpc).toHaveBeenLastCalledWith("admin_list_accounts", { p_search: "acme", p_limit: 25, p_offset: 50 });
  });

  it("deactivates an account and reloads the list", async () => {
    const { action } = accounts().proxy;

    action.setValues({ targetId: "acc-1", targetName: "Acme", enable: false, isOpen: true });
    await action.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("admin_set_account_active", { p_account_id: "acc-1", p_active: false });
    expect(toast.success).toHaveBeenCalledWith("Acme was deactivated.");
    expect(action.isOpen.value).toBe(false);
  });

  it("keeps the dialog open on an error", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not_allowed" } });

    const { action } = accounts().proxy;

    action.setValues({ targetId: "acc-1", targetName: "Acme", enable: false, isOpen: true });
    await action.submit();

    expect(toast.danger).toHaveBeenCalledWith("You don't have permission to do that.");
    expect(action.isOpen.value).toBe(true);
  });
});

describe("admin users", () => {
  it("blocks through the Server Action and explains a refusal", async () => {
    const store = createAdminUsersStore();

    store.setContext({ router, t: englishT });

    const { action } = store.proxy;

    setUserBlocked.mockResolvedValue({});
    action.setValues({ targetId: "u2", targetName: "bob@example.com", enable: false, isOpen: true });
    await action.submit();
    expect(setUserBlocked).toHaveBeenCalledWith("u2", true);
    expect(toast.success).toHaveBeenCalledWith("bob@example.com was blocked.");

    setUserBlocked.mockResolvedValue({ error: "self" });
    action.setValues({ targetId: "u1", targetName: "me@example.com", enable: false, isOpen: true });
    await action.submit();
    expect(toast.danger).toHaveBeenCalledWith("You cannot block yourself.");
  });
});
