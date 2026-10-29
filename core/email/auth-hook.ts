import type { EmailOtpType } from "@supabase/supabase-js";
import type { AuthEmail } from "./templates";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { routes } from "@/core/config/routes";


// Supabase Auth "Send Email Hook" (HTTP): instead of sending its own emails,
// Auth posts each one to app/api/auth/send-email, signed with the hook
// secret. Here: verifying the signature, reading the payload and deciding
// which emails to send. https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

const secretBytes = (secret: string) => Buffer.from(secret.replace(/^v1,whsec_/, ""), "base64");

/**
 * Standard Webhooks signature check (https://www.standardwebhooks.com), the
 * scheme of Supabase Auth hooks: HMAC-SHA256 of "<id>.<timestamp>.<body>".
 * `secrets` is SEND_EMAIL_HOOK_SECRET, several separated by "|" while rotating.
 */
export function verifyWebhook(body: string, { id, timestamp, signature }: WebhookHeaders, secrets: string, now = Date.now()) {
  if (!id || !timestamp || !signature) {
    return false;
  }

  const seconds = Number(timestamp);

  // Replayed or delayed requests are refused.
  if (!Number.isInteger(seconds) || Math.abs(now / 1000 - seconds) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const signed = `${id}.${timestamp}.${body}`;
  const expected = secrets.split("|").map((secret) => createHmac("sha256", secretBytes(secret)).update(signed).digest());
  // "v1,<base64> v1,<base64>": one entry per secret Auth signed with.
  const given = signature.split(" ").flatMap((entry) => {
    const [version, value] = entry.split(",");

    return version === "v1" && value ? [Buffer.from(value, "base64")] : [];
  });

  return given.some((candidate) => expected.some((digest) => candidate.length === digest.length && timingSafeEqual(candidate, digest)));
}

const payloadSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().default(""),
    new_email: z.string().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  email_data: z.object({
    token: z.string().default(""),
    token_hash: z.string().default(""),
    token_new: z.string().default(""),
    token_hash_new: z.string().default(""),
    redirect_to: z.string().default(""),
    site_url: z.string().default(""),
    email_action_type: z.string(),
  }),
});

export type SendEmailHookPayload = z.infer<typeof payloadSchema>;

export function parseHookPayload(body: string): SendEmailHookPayload | null {
  try {
    const result = payloadSchema.safeParse(JSON.parse(body));

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function webUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Link to /auth/confirm, which verifies the token hash on the server (works in
 * any browser). Auth has already checked redirect_to against the allowed
 * redirect URLs (falling back to the site URL), so its origin is the app the
 * user started from, e.g. a preview deployment; its `next` comes along.
 */
function confirmUrl(data: SendEmailHookPayload["email_data"], type: EmailOtpType, tokenHash: string) {
  const redirect = webUrl(data.redirect_to);
  const base = redirect ?? webUrl(data.site_url);

  if (!base) {
    throw new Error("The hook payload has neither redirect_to nor site_url");
  }

  const url = new URL(routes.authConfirm, base.origin);

  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);

  const next = redirect?.searchParams.get("next");

  if (next) {
    url.searchParams.set("next", next);
  }

  return url.toString();
}

/**
 * The emails to send for a hook call, or null for an action the app has no
 * email for (security notifications; enable them in Auth only together with
 * templates here).
 */
export function planAuthEmails({ user, email_data: data }: SendEmailHookPayload): AuthEmail[] | null {
  const emails = ((): AuthEmail[] | null => {
    switch (data.email_action_type) {
      case "signup":
        return [{ kind: "confirmSignup", to: user.email, url: confirmUrl(data, "email", data.token_hash) }];
      case "magiclink":
      case "email":
        return [{ kind: "magicLink", to: user.email, url: confirmUrl(data, "email", data.token_hash) }];
      case "recovery":
        return [{ kind: "recovery", to: user.email, url: confirmUrl(data, "recovery", data.token_hash) }];
      case "invite":
        return [{ kind: "authInvite", to: user.email, url: confirmUrl(data, "invite", data.token_hash) }];
      case "email_change": {
        const newEmail = user.new_email ?? "";
        const change = { currentEmail: user.email, newEmail };
        // The hash names are reversed for backward compatibility (see the hook
        // docs): token_hash confirms the new address, token_hash_new the
        // current one. The second is empty unless both addresses must confirm.
        const result: AuthEmail[] = [];

        if (data.token_hash) {
          result.push({ kind: "emailChange", to: newEmail, url: confirmUrl(data, "email_change", data.token_hash), ...change });
        }

        if (data.token_hash_new) {
          result.push({ kind: "emailChange", to: user.email, url: confirmUrl(data, "email_change", data.token_hash_new), ...change });
        }

        return result;
      }
      case "reauthentication":
        return [{ kind: "reauthentication", to: user.email, code: data.token }];
      default:
        return null;
    }
  })();

  const deliverable = emails?.filter((email) => email.to !== "");

  return deliverable && deliverable.length > 0 ? deliverable : null;
}
