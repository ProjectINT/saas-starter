import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { parseHookPayload, planAuthEmails, verifyWebhook, type SendEmailHookPayload } from "./auth-hook";

const SECRET = `v1,whsec_${Buffer.from("test-secret-of-some-length").toString("base64")}`;
const OTHER_SECRET = `v1,whsec_${Buffer.from("another-secret").toString("base64")}`;
const NOW = 1_800_000_000_000;

function sign(body: string, secret = SECRET, { id = "msg_1", timestamp = String(NOW / 1000) } = {}) {
  const key = Buffer.from(secret.replace("v1,whsec_", ""), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

  return { id, timestamp, signature: `v1,${signature}` };
}

describe("verifyWebhook", () => {
  const body = "{\"user\":{}}";

  it("accepts a body signed with the secret", () => {
    expect(verifyWebhook(body, sign(body), SECRET, NOW)).toBe(true);
  });

  it("rejects another secret, a changed body and missing headers", () => {
    expect(verifyWebhook(body, sign(body, OTHER_SECRET), SECRET, NOW)).toBe(false);
    expect(verifyWebhook(`${body} `, sign(body), SECRET, NOW)).toBe(false);
    expect(verifyWebhook(body, { ...sign(body), signature: null }, SECRET, NOW)).toBe(false);
  });

  it("rejects old or future timestamps", () => {
    const old = String(NOW / 1000 - 600);

    expect(verifyWebhook(body, sign(body, SECRET, { timestamp: old }), SECRET, NOW)).toBe(false);
    expect(verifyWebhook(body, sign(body, SECRET, { timestamp: "soon" }), SECRET, NOW)).toBe(false);
  });

  it("accepts any of several secrets, and any of several signatures", () => {
    expect(verifyWebhook(body, sign(body, OTHER_SECRET), `${SECRET}|${OTHER_SECRET}`, NOW)).toBe(true);

    const headers = sign(body);

    expect(verifyWebhook(body, { ...headers, signature: `v1,AAAA ${headers.signature}` }, SECRET, NOW)).toBe(true);
  });
});

function payload(emailData: Partial<SendEmailHookPayload["email_data"]>, user: Partial<SendEmailHookPayload["user"]> = {}) {
  return parseHookPayload(JSON.stringify({
    user: { id: "u1", email: "bob@example.com", ...user },
    email_data: {
      token: "123456",
      token_hash: "hash-a",
      token_new: "",
      token_hash_new: "",
      redirect_to: "https://preview.example.com/auth/callback?next=%2Finvite%2Fabc",
      site_url: "https://app.example.com",
      email_action_type: "signup",
      ...emailData,
    },
  }))!;
}

describe("parseHookPayload", () => {
  it("rejects bodies that are not a hook payload", () => {
    expect(parseHookPayload("not json")).toBeNull();
    expect(parseHookPayload("{\"user\":{}}")).toBeNull();
  });
});

describe("planAuthEmails", () => {
  it("links a sign-up to /auth/confirm on the origin of redirect_to, keeping next", () => {
    expect(planAuthEmails(payload({}))).toEqual([{
      kind: "confirmSignup",
      to: "bob@example.com",
      url: "https://preview.example.com/auth/confirm?token_hash=hash-a&type=email&next=%2Finvite%2Fabc",
    }]);
  });

  it("falls back to the site URL without redirect_to", () => {
    const [email] = planAuthEmails(payload({ email_action_type: "recovery", redirect_to: "" }))!;

    expect(email).toEqual({ kind: "recovery", to: "bob@example.com", url: "https://app.example.com/auth/confirm?token_hash=hash-a&type=recovery" });
  });

  it("sends an email change to both addresses with the swapped hashes", () => {
    const emails = planAuthEmails(payload(
      { email_action_type: "email_change", token_hash: "for-new", token_hash_new: "for-current" },
      { new_email: "bob@new.example.com" }
    ));

    expect(emails).toEqual([
      expect.objectContaining({ to: "bob@new.example.com", url: expect.stringContaining("token_hash=for-new&type=email_change") }),
      expect.objectContaining({ to: "bob@example.com", url: expect.stringContaining("token_hash=for-current&type=email_change") }),
    ]);
    expect(emails?.[0]).toMatchObject({ currentEmail: "bob@example.com", newEmail: "bob@new.example.com" });
  });

  it("sends a single email change to the new address only", () => {
    const emails = planAuthEmails(payload({ email_action_type: "email_change", token_hash: "for-new" }, { new_email: "bob@new.example.com" }));

    expect(emails).toHaveLength(1);
    expect(emails?.[0].to).toBe("bob@new.example.com");
  });

  it("puts the code into a reauthentication email", () => {
    expect(planAuthEmails(payload({ email_action_type: "reauthentication" }))).toEqual([
      { kind: "reauthentication", to: "bob@example.com", code: "123456" },
    ]);
  });

  it("has no email for notifications or users without an address", () => {
    expect(planAuthEmails(payload({ email_action_type: "password_changed_notification" }))).toBeNull();
    expect(planAuthEmails(payload({}, { email: "" }))).toBeNull();
  });
});
