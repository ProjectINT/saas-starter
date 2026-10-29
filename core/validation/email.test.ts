import { describe, expect, it } from "vitest";

import { normalizeEmail, validateEmail } from "./email";

describe("validateEmail", () => {
  it("accepts addresses the database accepts, after trimming and lowercasing", () => {
    expect(validateEmail("bob@example.com")).toBeNull();
    expect(validateEmail("  Bob@Example.COM ")).toBeNull();
    expect(normalizeEmail("  Bob@Example.COM ")).toBe("bob@example.com");
  });

  it("asks for an address when empty", () => {
    expect(validateEmail("   ")).toBe("Enter an email address.");
  });

  it("rejects what account_invitations_email_format rejects", () => {
    expect(validateEmail("bob")).toBe("Enter a valid email address.");
    expect(validateEmail("bob@example")).toBe("Enter a valid email address.");
    expect(validateEmail("bob smith@example.com")).toBe("Enter a valid email address.");
    expect(validateEmail(`${"a".repeat(250)}@x.io`)).toBe("Enter a valid email address.");
  });
});
