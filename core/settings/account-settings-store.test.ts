import { beforeEach, describe, expect, it, vi } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { createAccountSettingsStore } from "./account-settings-store";

const supabase = vi.hoisted(() => ({
  rpc: vi.fn(),
  /** What the next accounts update resolves with. */
  updateResult: { data: null as unknown, error: null as unknown },
  update: vi.fn(),
  from: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn() }));

vi.mock("@/core/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@heroui/react", () => ({ toast }));

supabase.from.mockImplementation(() => ({ update: supabase.update }));
supabase.update.mockImplementation(() => {
  const builder = {
    eq: () => builder,
    select: () => builder,
    maybeSingle: () => Promise.resolve(supabase.updateResult),
  };

  return builder;
});

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };

function setup() {
  const store = createAccountSettingsStore({ name: "Acme", slug: "acme" });

  store.setContext({ accountId: "acc-1", slug: "acme", name: "Acme", router, t: englishT });
  store.setTranslator(englishT);

  return store.proxy;
}

beforeEach(() => {
  vi.clearAllMocks();
  supabase.updateResult = { data: { slug: "acme" }, error: null };
});

describe("general", () => {
  it("saves the name and stays when the slug is the same", async () => {
    const { general } = setup();

    general.name.value = "  Acme Inc. ";
    await general.submit();

    expect(supabase.update).toHaveBeenCalledWith({ name: "Acme Inc.", slug: "acme" });
    expect(toast.success).toHaveBeenCalledWith("Account settings saved.");
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("moves to the new URL after a slug change", async () => {
    supabase.updateResult = { data: { slug: "acme-inc" }, error: null };

    const { general } = setup();

    general.slug.value = "Acme-Inc";
    await general.submit();

    expect(supabase.update).toHaveBeenCalledWith({ name: "Acme", slug: "acme-inc" });
    expect(router.replace).toHaveBeenCalledWith("/acme-inc/settings/account");
  });

  it("shows constraint errors under the slug and a missing row as no permission", async () => {
    supabase.updateResult = { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"accounts_slug_key\"" } };

    const { general } = setup();

    general.slug.value = "taken";
    await general.submit();
    expect(general.slug.errorMessage).toBe("This URL is already taken.");

    supabase.updateResult = { data: null, error: null };
    general.slug.value = "free-one";
    await general.submit();
    expect(general.formError.value).toBe("You don't have permission to do that.");
  });
});

describe("deletion", () => {
  it("needs the slug typed exactly", async () => {
    const { deletion } = setup();

    deletion.confirmation.value = "Acme";
    await deletion.submit();

    expect(deletion.confirmation.errorMessage).toBe("Type the account URL exactly.");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("deletes the account and goes to the account list", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { deletion } = setup();

    deletion.confirmation.value = "acme";
    await deletion.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("delete_account", { p_account_id: "acc-1" });
    expect(toast.success).toHaveBeenCalledWith("Acme was deleted.");
    expect(router.push).toHaveBeenCalledWith("/accounts");
  });

  it("shows why it was refused", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not_allowed" } });

    const { deletion } = setup();

    deletion.confirmation.value = "acme";
    await deletion.submit();

    expect(toast.danger).toHaveBeenCalledWith("You don't have permission to do that.");
    expect(router.push).not.toHaveBeenCalled();
  });
});
