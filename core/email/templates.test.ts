import { describe, expect, it } from "vitest";

import { englishT } from "@/core/i18n/testing";

import { authEmail, invitationEmail, welcomeEmail } from "./templates";

describe("invitationEmail", () => {
  const email = invitationEmail(englishT, "en", {
    to: "carol@example.com",
    accountName: "Acme <Inc>",
    inviterName: "Ada Admin",
    role: "admin",
    url: "https://app.example.com/invite/token",
  });

  it("names the inviter, the account and the role", () => {
    expect(email.to).toBe("carol@example.com");
    expect(email.subject).toBe("Ada Admin invited you to Acme <Inc>");
    expect(email.text).toContain("Ada Admin invited you to join Acme <Inc> on SaaS Starter with the Admin role.");
    expect(email.text).toContain("Accept invitation: https://app.example.com/invite/token");
    expect(email.text).toContain("valid for 7 days and only for carol@example.com");
  });

  it("escapes the account name in HTML", () => {
    expect(email.html).toContain("Acme &lt;Inc&gt;");
    expect(email.html).not.toContain("Acme <Inc>");
  });

  it("stands in for an unknown inviter", () => {
    const anonymous = invitationEmail(englishT, "en", {
      to: "carol@example.com",
      accountName: "Acme",
      inviterName: "",
      role: "member",
      url: "https://app.example.com/invite/token",
    });

    expect(anonymous.subject).toBe("A member invited you to Acme");
  });
});

describe("welcomeEmail", () => {
  it("links to the app", () => {
    const email = welcomeEmail(englishT, "en", { to: "bob@example.com", url: "https://app.example.com/accounts" });

    expect(email.subject).toBe("Welcome to SaaS Starter");
    expect(email.text).toContain("Open SaaS Starter: https://app.example.com/accounts");
  });
});

describe("authEmail", () => {
  it("writes each kind with its link and expiry", () => {
    const url = "https://app.example.com/auth/confirm?token_hash=x&type=email";

    expect(authEmail(englishT, "en", { kind: "confirmSignup", to: "bob@example.com", url }).text).toContain(
      "Follow the link to confirm bob@example.com and finish signing up for SaaS Starter."
    );
    expect(authEmail(englishT, "en", { kind: "recovery", to: "bob@example.com", url }).text).toContain(
      "The link works once and expires in an hour."
    );
    expect(authEmail(englishT, "en", {
      kind: "emailChange",
      to: "bob@new.example.com",
      url,
      currentEmail: "bob@example.com",
      newEmail: "bob@new.example.com",
    }).text).toContain("from bob@example.com to bob@new.example.com");
  });

  it("shows a reauthentication code", () => {
    const email = authEmail(englishT, "en", { kind: "reauthentication", to: "bob@example.com", code: "123456" });

    expect(email.subject).toBe("Your confirmation code");
    expect(email.text).toContain("123456");
  });
});
