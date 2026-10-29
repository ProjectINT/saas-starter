import { describe, expect, it } from "vitest";

import { rpcErrorKey, rpcErrorMessage } from "./rpc-errors";

// Shapes as returned by PostgREST for the tenancy RPCs.
describe("rpcErrorKey", () => {
  it("reads raised keys from the message", () => {
    expect(rpcErrorKey({ code: "42501", message: "not_allowed" })).toBe("not_allowed");
    expect(rpcErrorKey({ code: "22023", message: "invitation_expired" })).toBe("invitation_expired");
  });

  it("matches check constraints by name", () => {
    expect(
      rpcErrorKey({
        code: "23514",
        message: "new row for relation \"account_invitations\" violates check constraint \"account_invitations_email_format\"",
      })
    ).toBe("account_invitations_email_format");
  });

  it("ignores unknown errors", () => {
    expect(rpcErrorKey({ code: "42501", message: "permission denied for function remove_member" })).toBeNull();
    expect(rpcErrorKey({ code: "22P02", message: "invalid input syntax for type uuid: \"x\"" })).toBeNull();
  });
});

describe("rpcErrorMessage", () => {
  it("maps keys to text and falls back for the rest", () => {
    expect(rpcErrorMessage({ message: "owner_cannot_leave" })).toMatch(/Transfer ownership/);
    expect(rpcErrorMessage({ message: "boom" })).toBe("Something went wrong. Try again.");
  });
});
