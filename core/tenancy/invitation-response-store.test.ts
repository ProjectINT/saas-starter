import { beforeEach, describe, expect, it, vi } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { createInvitationResponseStore } from "./invitation-response-store";

const supabase = vi.hoisted(() => ({ rpc: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn() }));

vi.mock("@/core/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@heroui/react", () => ({ toast }));

const router = { push: vi.fn(), refresh: vi.fn() };

function setup(invitationId = "inv-1") {
  const store = createInvitationResponseStore();

  store.setContext({ invitationId, router, t: englishT });

  return store.proxy.response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invitation response", () => {
  it("accepts and opens the account, staying busy while it loads", async () => {
    supabase.rpc.mockResolvedValue({ data: { name: "Acme", slug: "acme" }, error: null });

    const response = setup();

    response.setValues({ choice: "accept" });
    await response.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("accept_invitation", { p_invitation_id: "inv-1" });
    expect(toast.success).toHaveBeenCalledWith("You joined Acme.");
    expect(router.push).toHaveBeenCalledWith("/acme");
    expect(response.choice.value).toBe("accept");
  });

  it("declines and returns to the account list", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const response = setup();

    response.setValues({ choice: "decline" });
    await response.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("decline_invitation", { p_invitation_id: "inv-1" });
    expect(router.push).toHaveBeenCalledWith("/accounts");
  });

  it("shows the error and frees the buttons on failure", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "invitation_expired" } });

    const response = setup();

    response.setValues({ choice: "accept" });
    await response.submit();

    expect(toast.danger).toHaveBeenCalledWith("This invitation has expired. Ask for a new one.");
    expect(router.push).not.toHaveBeenCalled();
    expect(response.choice.value).toBe("");
  });

  it("keeps one store per invitation", async () => {
    supabase.rpc.mockResolvedValue({ data: { name: "Acme", slug: "acme" }, error: null });

    const first = setup("inv-1");
    const second = setup("inv-2");

    second.setValues({ choice: "accept" });
    await second.submit();

    expect(supabase.rpc).toHaveBeenCalledWith("accept_invitation", { p_invitation_id: "inv-2" });
    expect(first.choice.value).toBe("");
  });
});
