import { describe, expect, it } from "vitest";

import { slugify, validateSlug } from "./slug";

describe("validateSlug", () => {
  it("accepts valid slugs", () => {
    ["acme", "a1b", "acme-inc", "x".repeat(48)].forEach((slug) => expect(validateSlug(slug)).toBeNull());
  });

  it("enforces the length", () => {
    expect(validateSlug("ab")).toMatch(/at least 3/);
    expect(validateSlug("x".repeat(49))).toMatch(/at most 48/);
  });

  it("enforces the format", () => {
    ["Acme", "-acme", "acme-", "ac me", "acme_inc", "акме"].forEach((slug) => expect(validateSlug(slug)).toMatch(/lowercase/));
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Acme Inc.")).toBe("acme-inc");
    expect(slugify("  Hello,   World!  ")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Señor")).toBe("cafe-senor");
  });

  it("transliterates Cyrillic", () => {
    expect(slugify("Ромашка и Ко")).toBe("romashka-i-ko");
    expect(slugify("Щука Объём")).toBe("shchuka-obem");
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify("日本")).toBe("");
    expect(slugify("!!!")).toBe("");
  });

  it("produces valid slugs within the length limit", () => {
    const slug = slugify(`${"word ".repeat(20)}end`);

    expect(slug.length).toBeLessThanOrEqual(48);
    expect(validateSlug(slug)).toBeNull();
  });
});
