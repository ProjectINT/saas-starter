import { describe, expect, it } from "vitest";

import { GUEST_ONLY_ROUTES, PUBLIC_ROUTES, isGuestOnlyRoute, isPublicRoute, matchesRoute } from "./public-routes";

describe("isPublicRoute", () => {
  describe("exact matches", () => {
    it("matches the root", () => {
      expect(isPublicRoute("/")).toBe(true);
    });

    it("matches every public route", () => {
      PUBLIC_ROUTES.forEach((route) => expect(isPublicRoute(route)).toBe(true));
    });

    it("does not match app routes", () => {
      ["/accounts", "/onboarding", "/reset-password", "/acme", "/acme/settings", "/admin", "/api/anything"].forEach((route) =>
        expect(isPublicRoute(route)).toBe(false)
      );
    });
  });

  describe("normalization", () => {
    it("ignores trailing slashes", () => {
      PUBLIC_ROUTES.filter((route) => route !== "/").forEach((route) => {
        expect(isPublicRoute(`${route}/`)).toBe(true);
        expect(isPublicRoute(`${route}///`)).toBe(true);
      });
      expect(isPublicRoute("//")).toBe(true);
      expect(isPublicRoute("/accounts/")).toBe(false);
    });

    it("ignores surrounding whitespace", () => {
      expect(isPublicRoute("  /sign-in  ")).toBe(true);
      expect(isPublicRoute("\t/sign-up\t")).toBe(true);
      expect(isPublicRoute("   /   ")).toBe(true);
    });

    it("decodes the path before matching", () => {
      expect(isPublicRoute("/%73ign-in")).toBe(true);
      expect(isPublicRoute("/sign%2Din")).toBe(true);
    });

    it("is case sensitive", () => {
      expect(isPublicRoute("/Sign-In")).toBe(false);
      expect(isPublicRoute("/SIGN-UP")).toBe(false);
    });
  });

  describe("bypass attempts", () => {
    it("rejects prefixes and look-alikes", () => {
      ["/sign-in-evil", "/sign-up-x", "/privacy-policy-fake", "/sig", "/auth", "/signin", "/sign_in"].forEach((route) =>
        expect(isPublicRoute(route)).toBe(false)
      );
    });

    it("rejects children of exact routes", () => {
      ["/sign-in/admin", "/auth/callback/x", "/auth/confirm/success", "/sign-in//admin"].forEach((route) =>
        expect(isPublicRoute(route)).toBe(false)
      );
    });

    it("rejects traversal, protocol-relative and absolute URLs", () => {
      [
        "/../accounts",
        "/./sign-in",
        "/sign-in/../accounts",
        "/sign-in/./accounts",
        "/sign-in%2f../accounts",
        "/sign-in%2e%2e/accounts",
        "//evil.com/sign-in",
        "http://evil.com/sign-in",
      ].forEach((route) => expect(isPublicRoute(route)).toBe(false));
    });

    it("rejects query strings, fragments and spaces glued to the path", () => {
      ["/sign-in?next=/acme", "/sign-in#x", "/sign-in%20evil"].forEach((route) => expect(isPublicRoute(route)).toBe(false));
    });

    it("rejects null bytes and invalid encoding", () => {
      ["/sign-in\0", "/sign-in%00", "/%", "/%ZZ", ""].forEach((route) => expect(isPublicRoute(route)).toBe(false));
    });

    it("rejects very long paths under a public route", () => {
      expect(isPublicRoute(`/sign-in${"/a".repeat(1000)}`)).toBe(false);
    });
  });
});

describe("isGuestOnlyRoute", () => {
  it("covers the sign-in, sign-up and forgot-password pages", () => {
    GUEST_ONLY_ROUTES.forEach((route) => expect(isGuestOnlyRoute(route)).toBe(true));
    expect(isGuestOnlyRoute("/sign-in/")).toBe(true);
  });

  it("leaves pages a signed-in user needs alone", () => {
    ["/", "/auth/callback", "/auth/confirm", "/reset-password", "/accounts", "/terms-of-use"].forEach((route) =>
      expect(isGuestOnlyRoute(route)).toBe(false)
    );
  });

  it("only lists public routes", () => {
    GUEST_ONLY_ROUTES.forEach((route) => expect(PUBLIC_ROUTES).toContain(route));
  });
});

describe("matchesRoute wildcards", () => {
  const list = ["/docs/*", "/*"];

  it("matches the base and its subtree", () => {
    expect(matchesRoute("/docs", list)).toBe(true);
    expect(matchesRoute("/docs/a/b", list)).toBe(true);
  });

  it("does not match siblings with the same prefix", () => {
    expect(matchesRoute("/docs-evil", list)).toBe(false);
  });

  it("treats a bare /* as the root only", () => {
    expect(matchesRoute("/", list)).toBe(true);
    expect(matchesRoute("/anything", list)).toBe(false);
  });
});
