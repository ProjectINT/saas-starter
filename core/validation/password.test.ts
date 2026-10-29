import { describe, expect, it } from "vitest";

import { validatePassword } from "./password";

describe("validatePassword", () => {
  it("accepts letters and digits of minimum length", () => {
    expect(validatePassword("abcdefg1")).toBeNull();
    expect(validatePassword("ПарольAa1")).toBeNull();
  });

  it("requires the minimum length", () => {
    expect(validatePassword("abc1")).toMatch(/at least 8/);
  });

  it("requires a Latin letter and a digit", () => {
    expect(validatePassword("abcdefgh")).toMatch(/letters and digits/);
    expect(validatePassword("12345678")).toMatch(/letters and digits/);
    // Supabase counts only ASCII letters.
    expect(validatePassword("пароль123")).toMatch(/letters and digits/);
  });
});
