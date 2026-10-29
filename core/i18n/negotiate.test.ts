import { describe, expect, it } from "vitest";

import { negotiateLocale, supportedLocale } from "./negotiate";

describe("negotiateLocale", () => {
  it("falls back to English without a header", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
  });

  it("matches region tags to their base language", () => {
    expect(negotiateLocale("ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("ru");
    expect(negotiateLocale("en-GB")).toBe("en");
  });

  it("follows the weights, not the order", () => {
    expect(negotiateLocale("en;q=0.5,ru;q=0.9")).toBe("ru");
  });

  it("skips unsupported languages and q=0", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,ru;q=0.8")).toBe("ru");
    expect(negotiateLocale("ru;q=0,en;q=0.1")).toBe("en");
    expect(negotiateLocale("de,fr")).toBe("en");
  });

  it("treats * as the default", () => {
    expect(negotiateLocale("de,*;q=0.5,ru;q=0.1")).toBe("en");
  });
});

describe("supportedLocale", () => {
  it("accepts listed locales in any case", () => {
    expect(supportedLocale("ru")).toBe("ru");
    expect(supportedLocale("RU")).toBe("ru");
  });

  it("rejects the rest", () => {
    expect(supportedLocale("pt-BR")).toBeNull();
    expect(supportedLocale("")).toBeNull();
    expect(supportedLocale(undefined)).toBeNull();
  });
});
