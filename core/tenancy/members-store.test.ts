import { beforeEach, describe, expect, it, vi } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { createMembersStore, inviteErrorFields } from "./members-store";

const supabase = vi.hoisted(() => ({
  rpc: vi.fn(),
  /** Rows the next table query resolves with, by table. */
  rows: {} as Record<string, unknown[]>,
  from: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn() }));

vi.mock("@/core/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@heroui/react", () => ({ toast }));

// A PostgREST query builder: every filter returns the builder, awaiting it gives the rows.
supabase.from.mockImplementation((table: string) => {
  const result = Promise.resolve({ data: supabase.rows[table] ?? [], error: null });
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    then: result.then.bind(result),
  };

  return builder;
});

const router = { push: vi.fn(), refresh: vi.fn() };

function setup() {
  const store = createMembersStore();

  store.setContext({ accountId: "acc-1", router, t: englishT });
  store.setTranslator(englishT);

  return store;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rows = {};
});

describe("members list", () => {
  it("loads members of the account in the context, owner first", async () => {
    supabase.rows.account_members = [
      { user_id: "u2", role: "member", profile: { email: "bob@example.com", first_name: "Bob", last_name: null } },
      { user_id: "u1", role: "owner", profile: { email: "alice@example.com", first_name: null, last_name: null } },
    ];

    const store = setup();
    const { members } = store.proxy;

    void members.items; // first access starts the resolver
    await settle();

    expect(supabase.from).toHaveBeenCalledWith("account_members");
    expect(members.getValues()).toEqual([
      { id: "u1", role: "owner", name: "alice@example.com", email: "alice@example.com" },
      { id: "u2", role: "member", name: "Bob", email: "bob@example.com" },
    ]);
  });

  it("does not query before the account is known", async () => {
    const store = createMembersStore();

    void store.proxy.members.items;
    await settle();

    expect(supabase.from).not.toHaveBeenCalled();
    expect(store.proxy.members.length).toBe(0);
  });
});

describe("invite form", () => {
  it("validates the email before calling the RPC", async () => {
    const { invite } = setup().proxy;

    expect(await invite.submit()).toMatchObject({ success: false });
    expect(invite.email.errorMessage).toBe("Enter an email address.");

    invite.email.value = "bob@";
    expect(invite.email.errorMessage).toBe("Enter a valid email address.");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("sends the normalized email and shows the link once created", async () => {
    supabase.rpc.mockResolvedValue({ data: "t".repeat(43), error: null });

    const { invite } = setup().proxy;

    invite.email.value = "  Carol@Example.com ";
    invite.role.value = "admin";

    expect(await invite.submit()).toEqual({ success: true, result: undefined });
    expect(supabase.rpc).toHaveBeenCalledWith("create_invitation", {
      p_account_id: "acc-1",
      p_email: "carol@example.com",
      p_role: "admin",
    });
    expect(invite.link.value).toBe(`/invite/${"t".repeat(43)}`);
    // The invitations list reloads.
    expect(supabase.from).toHaveBeenCalledWith("account_invitations");
  });

  it("shows RPC errors under the field they concern until it changes", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "already_member" } });

    const { invite } = setup().proxy;

    invite.email.value = "bob@example.com";
    await invite.submit();

    expect(invite.email.errorMessage).toBe("This person is already a member.");
    expect(invite.link.value).toBe("");

    invite.email.value = "bobby@example.com";
    expect(invite.email.isInvalid).toBeFalsy();

    supabase.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "invalid_role" } });
    await invite.submit();
    expect(invite.role.errorMessage).toBe("This role can't be given.");

    supabase.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not_allowed" } });
    invite.role.value = "admin";
    await invite.submit();
    expect(invite.formError.value).toBe("You don't have permission to do that.");
    expect(invite.email.isInvalid).toBeFalsy();
  });

  it("starts over on reset", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "already_member" } });

    const { invite } = setup().proxy;

    invite.email.value = "bob@example.com";
    invite.role.value = "admin";
    await invite.submit();
    invite.reset();

    expect(invite.values).toMatchObject({ email: "", role: "member", emailError: "", formError: "", link: "" });
    expect(invite.revalidate).toBe(false);
    expect(invite.email.isInvalid).toBeFalsy();
  });
});

describe("inviteErrorFields", () => {
  it("routes errors to email, role or the whole form", () => {
    expect(inviteErrorFields({ code: "23505", message: "already_member" }, englishT).emailError).toMatch(/already a member/);
    expect(
      inviteErrorFields({
        code: "23514",
        message: "new row for relation \"account_invitations\" violates check constraint \"account_invitations_email_format\"",
      }, englishT).emailError
    ).toBe("Enter a valid email address.");
    expect(inviteErrorFields({ code: "22023", message: "invalid_role" }, englishT).roleError).toMatch(/role/);
    expect(inviteErrorFields({ code: "42501", message: "not_allowed" }, englishT)).toEqual({
      emailError: "",
      roleError: "",
      formError: "You don't have permission to do that.",
    });
  });
});

describe("member actions", () => {
  it("changes a role, reports it and clears the action", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { action } = setup().proxy;

    action.setValues({ type: "role", targetId: "u2", targetName: "Bob", role: "admin" });
    await action.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("change_member_role", { p_account_id: "acc-1", p_user_id: "u2", p_role: "admin" });
    expect(toast.success).toHaveBeenCalledWith("Bob now has the Admin role.");
    expect(action.type.value).toBe("");
  });

  it("keeps a failed confirmation open and shows the error", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not_allowed" } });

    const { action } = setup().proxy;

    action.setValues({ type: "remove", targetId: "u2", targetName: "Bob" });
    await action.submit();

    expect(toast.danger).toHaveBeenCalledWith("You don't have permission to do that.");
    expect(action.type.value).toBe("remove");
  });

  it("refreshes the account context after a transfer and leaves to /accounts", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { action } = setup().proxy;

    action.setValues({ type: "transfer", targetId: "u2", targetName: "Bob" });
    await action.submit();
    expect(supabase.rpc).toHaveBeenCalledWith("transfer_ownership", { p_account_id: "acc-1", p_new_owner_id: "u2" });
    expect(router.refresh).toHaveBeenCalled();

    action.setValues({ type: "leave", targetId: "u1", targetName: "Acme" });
    await action.submit();
    expect(supabase.rpc).toHaveBeenCalledWith("leave_account", { p_account_id: "acc-1" });
    expect(router.push).toHaveBeenCalledWith("/accounts");
  });

  it("revokes an invitation", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { action } = setup().proxy;

    action.setValues({ type: "revoke", targetId: "inv-1", targetName: "carol@example.com" });
    await action.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("revoke_invitation", { p_invitation_id: "inv-1" });
    expect(toast.success).toHaveBeenCalledWith("Invitation for carol@example.com revoked.");
  });
});
