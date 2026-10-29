import { describe, expect, it } from "vitest";

import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNextPath("/acme")).toBe("/acme");
    expect(safeNextPath("/acme/settings?tab=members#invite")).toBe("/acme/settings?tab=members#invite");
  });

  it("falls back when the value is missing", () => {
    expect(safeNextPath(null)).toBe("/accounts");
    expect(safeNextPath(undefined)).toBe("/accounts");
    expect(safeNextPath("")).toBe("/accounts");
    expect(safeNextPath(null, "/reset-password")).toBe("/reset-password");
  });

  it("takes the first value of a repeated parameter", () => {
    expect(safeNextPath(["/acme", "https://evil.com"])).toBe("/acme");
    expect(safeNextPath(["https://evil.com", "/acme"])).toBe("/accounts");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    [
      "https://evil.com",
      "//evil.com",
      "///evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "javascript:alert(1)",
      "evil.com/acme",
      "acme",
    ].forEach((value) => expect(safeNextPath(value)).toBe("/accounts"));
  });

  it("rejects control characters browsers would strip", () => {
    ["/\t/evil.com", "/\n/evil.com", "/acme\r", "/acme\0"].forEach((value) => expect(safeNextPath(value)).toBe("/accounts"));
  });

  it("does not loop back into sign-in pages", () => {
    ["/sign-in", "/sign-in/", "/sign-up?next=/acme", "/forgot-password"].forEach((value) =>
      expect(safeNextPath(value)).toBe("/accounts")
    );
  });

  it("normalizes dot segments", () => {
    expect(safeNextPath("/acme/../accounts")).toBe("/accounts");
    expect(safeNextPath("/a/../sign-in")).toBe("/accounts");
  });

  it("keeps encoded slashes encoded", () => {
    expect(safeNextPath("/%2F%2Fevil.com")).toBe("/%2F%2Fevil.com");
  });
});
