import { describe, expect, it } from "vitest";

import { inviteErrorState } from "./invite-state";

const values = { email: "bob@example.com", role: "member" };

describe("inviteErrorState", () => {
  it("puts email problems under the email field", () => {
    expect(inviteErrorState({ code: "23505", message: "already_member" }, values)).toEqual({
      errors: { email: "This person is already a member." },
      formError: null,
      values,
      invitePath: null,
    });
    expect(
      inviteErrorState({
        code: "23514",
        message: "new row for relation \"account_invitations\" violates check constraint \"account_invitations_email_format\"",
      }, values).errors
    ).toHaveProperty("email");
  });

  it("puts role problems under the role field", () => {
    expect(inviteErrorState({ code: "22023", message: "invalid_role" }, values).errors).toHaveProperty("role");
  });

  it("reports the rest above the form", () => {
    expect(inviteErrorState({ code: "42501", message: "not_allowed" }, values)).toEqual({
      errors: {},
      formError: "You don't have permission to do that.",
      values,
      invitePath: null,
    });
  });
});
