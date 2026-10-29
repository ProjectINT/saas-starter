import { beforeEach, describe, expect, it, vi } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { createAccountErrorFields, createAccountStore } from "./create-account-store";

const supabase = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/core/supabase/client", () => ({ createClient: () => supabase }));

const router = { push: vi.fn() };

function setup() {
  const store = createAccountStore();

  store.setContext({ router, t: englishT });
  store.setTranslator(englishT);

  return store.proxy.account;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("create account form", () => {
  it("derives the slug from the name until the slug is edited", () => {
    const form = setup();

    form.name.value = "Acme Café";
    expect(form.slug.value).toBe("acme-cafe");

    form.slug.value = "Acme-HQ";
    expect(form.slug.value).toBe("acme-hq");
    form.name.value = "Acme Holding";
    expect(form.slug.value).toBe("acme-hq");

    // Clearing the slug hands it back to the name.
    form.slug.value = "";
    form.name.value = "Ромашка";
    expect(form.slug.value).toBe("romashka");
  });

  it("validates name and slug before calling the RPC", async () => {
    const form = setup();

    expect(await form.submit()).toMatchObject({ success: false });
    expect(form.name.errorMessage).toBe("Enter the account name.");
    expect(form.slug.errorMessage).toBe("Use at least 3 characters.");

    form.name.value = "A".repeat(101);
    expect(form.name.errorMessage).toBe("Use at most 100 characters.");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("puts a taken slug under the slug field until it changes", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint \"accounts_slug_key\"" },
    });

    const form = setup();

    form.name.value = "Acme";
    await form.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("create_account", { p_name: "Acme", p_slug: "acme" });
    expect(form.slug.errorMessage).toBe("This URL is already taken.");
    expect(form.name.isInvalid).toBeFalsy();

    form.slug.value = "acme-2";
    expect(form.slug.isInvalid).toBeFalsy();
  });

  it("opens the new account", async () => {
    supabase.rpc.mockResolvedValue({ data: { slug: "acme" }, error: null });

    const form = setup();

    form.name.value = "Acme";
    await form.submit();

    expect(router.push).toHaveBeenCalledWith("/acme");
    expect(form.redirecting.value).toBe(true);
  });
});

// Shapes as returned by PostgREST for public.create_account.
describe("createAccountErrorFields", () => {
  it("reports reserved and malformed slugs on the slug field", () => {
    expect(
      createAccountErrorFields({
        code: "23514",
        message: "new row for relation \"accounts\" violates check constraint \"accounts_slug_not_reserved\"",
      }, englishT).slugError
    ).toMatch(/reserved/);
    expect(
      createAccountErrorFields({
        code: "23514",
        message: "new row for relation \"accounts\" violates check constraint \"accounts_slug_format\"",
      }, englishT).slugError
    ).toMatch(/Lowercase/);
  });

  it("reports an invalid name on the name field", () => {
    expect(
      createAccountErrorFields({
        code: "23514",
        message: "new row for relation \"accounts\" violates check constraint \"accounts_name_check\"",
      }, englishT).nameError
    ).toMatch(/100 characters/);
  });

  it("falls back to a form error", () => {
    expect(createAccountErrorFields({ code: "42501", message: "Not authenticated" }, englishT)).toEqual({
      nameError: "",
      slugError: "",
      formError: "Could not create the account. Try again.",
    });
  });
});
