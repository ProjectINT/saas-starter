import { describe, expect, it } from "vitest";

import { authErrorMessage } from "./errors";

describe("authErrorMessage", () => {
  it("maps known codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials", status: 400 })).toBe("Invalid email or password.");
    expect(authErrorMessage({ code: "weak_password" })).toMatch(/^This password is too weak\./);
  });

  it("treats any 429 as rate limiting", () => {
    expect(authErrorMessage({ code: "some_new_limit", status: 429 })).toMatch(/Too many attempts/);
  });

  it("recognizes network failures", () => {
    expect(authErrorMessage({ name: "AuthRetryableFetchError", status: 0 })).toMatch(/Cannot reach the server/);
  });

  it("never leaks unknown server messages", () => {
    expect(authErrorMessage({ code: "unexpected_failure", status: 500 })).toBe("Something went wrong. Try again.");
  });
});
