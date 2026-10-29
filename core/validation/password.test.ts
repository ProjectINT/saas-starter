import { describe, expect, it } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { validatePassword } from "./password";

describe("validatePassword", () => {
  it("accepts letters and digits of minimum length", () => {
    expect(validatePassword("abcdefg1", englishT)).toBeNull();
    expect(validatePassword("ПарольAa1", englishT)).toBeNull();
  });

  it("requires the minimum length", () => {
    expect(validatePassword("abc1", englishT)).toMatch(/at least 8/);
  });

  it("requires a Latin letter and a digit", () => {
    expect(validatePassword("abcdefgh", englishT)).toMatch(/letters and digits/);
    expect(validatePassword("12345678", englishT)).toMatch(/letters and digits/);
    // Supabase counts only ASCII letters.
    expect(validatePassword("пароль123", englishT)).toMatch(/letters and digits/);
  });
});
