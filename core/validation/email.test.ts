import { describe, expect, it } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { normalizeEmail, validateEmail } from "./email";

describe("validateEmail", () => {
  it("accepts addresses the database accepts, after trimming and lowercasing", () => {
    expect(validateEmail("bob@example.com", englishT)).toBeNull();
    expect(validateEmail("  Bob@Example.COM ", englishT)).toBeNull();
    expect(normalizeEmail("  Bob@Example.COM ")).toBe("bob@example.com");
  });

  it("asks for an address when empty", () => {
    expect(validateEmail("   ", englishT)).toBe("Enter an email address.");
  });

  it("rejects what account_invitations_email_format rejects", () => {
    expect(validateEmail("bob", englishT)).toBe("Enter a valid email address.");
    expect(validateEmail("bob@example", englishT)).toBe("Enter a valid email address.");
    expect(validateEmail("bob smith@example.com", englishT)).toBe("Enter a valid email address.");
    expect(validateEmail(`${"a".repeat(250)}@x.io`, englishT)).toBe("Enter a valid email address.");
  });
});
