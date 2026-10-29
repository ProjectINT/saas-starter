import { beforeEach, describe, expect, it, vi } from "vitest";

import { reported } from "@/core/errors/testing";
import { englishT } from "@/core/i18n/testing";

import { createProfileStore } from "./profile-store";

const supabase = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
  auth: { updateUser: vi.fn() },
  from: vi.fn(),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn() }));

vi.mock("@/core/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@heroui/react", () => ({ toast }));

supabase.from.mockImplementation(() => ({ update: supabase.update }));
supabase.update.mockImplementation(() => ({ eq: supabase.eq }));

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };

function setup() {
  vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });

  const store = createProfileStore({ firstName: "Ada", lastName: "", email: "ada@example.com" });

  store.setContext({ userId: "u1", slug: "acme", router, t: englishT });
  store.setTranslator(englishT);

  return store.proxy;
}

beforeEach(() => {
  vi.clearAllMocks();
  supabase.eq.mockResolvedValue({ error: null });
});

describe("name", () => {
  it("saves trimmed names, empty ones as null, and refreshes the page", async () => {
    const { name } = setup();

    name.firstName.value = "  Ada ";
    name.lastName.value = "   ";
    await name.submit();

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.update).toHaveBeenCalledWith({ first_name: "Ada", last_name: null });
    expect(supabase.eq).toHaveBeenCalledWith("id", "u1");
    expect(toast.success).toHaveBeenCalledWith("Your name has been saved.");
    expect(router.refresh).toHaveBeenCalled();
  });

  it("reports a failed save and says so", async () => {
    supabase.eq.mockResolvedValue({ error: { code: "500", message: "boom" } });

    const { name } = setup();

    await name.submit();

    expect(name.formError.value).toBe("Could not save. Try again.");
    expect(reported.events).toHaveLength(1);
  });
});

describe("email", () => {
  it("asks Auth to change it, with a link back to these settings", async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

    const { email } = setup();

    email.email.value = " Ada@New.example.com ";
    await email.submit();

    expect(supabase.auth.updateUser).toHaveBeenCalledWith(
      { email: "ada@new.example.com" },
      { emailRedirectTo: "http://localhost:3000/auth/callback?next=%2Facme%2Fsettings%2Fprofile" }
    );
    expect(email.sentTo.value).toBe("ada@new.example.com");
  });

  it("refuses the current address and shows Auth errors under the field", async () => {
    const { email } = setup();

    email.email.value = "ada@example.com";
    await email.submit();
    expect(email.email.errorMessage).toBe("This is already your email.");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();

    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: { code: "email_exists", status: 422 } });
    email.email.value = "taken@example.com";
    await email.submit();
    expect(email.email.errorMessage).toBe("An account with this email already exists.");
  });
});

describe("password", () => {
  it("checks the rules and the confirmation before calling Auth", async () => {
    const { password } = setup();

    password.password.value = "short";
    password.confirm.value = "short";
    await password.submit();
    expect(password.password.errorMessage).toBe("Use at least 8 characters.");

    password.password.value = "longer123";
    password.confirm.value = "longer124";
    await password.submit();
    expect(password.confirm.errorMessage).toBe("Passwords do not match.");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("changes it and clears the form, or shows why not", async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: { code: "same_password", status: 422 } });

    const { password } = setup();

    password.password.value = "longer123";
    password.confirm.value = "longer123";
    await password.submit();
    expect(password.password.errorMessage).toBe("The new password must be different from the current one.");

    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    password.password.value = "longer1234";
    password.confirm.value = "longer1234";
    await password.submit();
    expect(supabase.auth.updateUser).toHaveBeenLastCalledWith({ password: "longer1234" });
    expect(toast.success).toHaveBeenCalledWith("Your password has been changed.");
    expect(password.values).toMatchObject({ password: "", confirm: "" });
  });
});
