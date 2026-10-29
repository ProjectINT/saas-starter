import { describe, expect, it } from "vitest";

import { reported } from "@/core/errors/testing";
import { englishT } from "@/core/i18n/testing";

import { authErrorMessage } from "./errors";

describe("authErrorMessage", () => {
  it("maps known codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials", status: 400 }, englishT)).toBe("Invalid email or password.");
    expect(authErrorMessage({ code: "weak_password" }, englishT)).toMatch(/^This password is too weak\./);
  });

  it("treats any 429 as rate limiting", () => {
    expect(authErrorMessage({ code: "some_new_limit", status: 429 }, englishT)).toMatch(/Too many attempts/);
  });

  it("recognizes network failures", () => {
    expect(authErrorMessage({ name: "AuthRetryableFetchError", status: 0 }, englishT)).toMatch(/Cannot reach the server/);
  });

  it("never leaks unknown server messages", () => {
    expect(authErrorMessage({ code: "unexpected_failure", status: 500 }, englishT)).toBe("Something went wrong. Try again.");
    expect(reported.events).toHaveLength(1);
  });

  it("explains a send-email hook that did not answer, and reports it", () => {
    expect(authErrorMessage({ code: "hook_timeout", status: 422 }, englishT)).toBe("We could not send the email. Try again in a few minutes.");
    expect(reported.events).toHaveLength(1);
  });

  it("does not report expected outcomes", () => {
    authErrorMessage({ code: "invalid_credentials", status: 400 }, englishT);
    authErrorMessage({ name: "AuthRetryableFetchError", status: 0 }, englishT);
    expect(reported.events).toHaveLength(0);
  });
});
