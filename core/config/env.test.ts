import { describe, expect, it } from "vitest";

import { EnvError, parseEnv, publicEnvSchema, serverEnvSchema } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54421",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  EMAIL_PROVIDER: "console",
  EMAIL_FROM: "Test <noreply@example.com>",
};

describe("parseEnv", () => {
  it("returns the parsed values", () => {
    expect(parseEnv(serverEnvSchema, { ...valid, UNRELATED: "x" })).toEqual(valid);
  });

  it("lists every missing variable", () => {
    expect(() => parseEnv(serverEnvSchema, {})).toThrow(EnvError);

    try {
      parseEnv(serverEnvSchema, {});
    } catch (error) {
      const message = (error as EnvError).message;

      expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL is not set");
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
      expect(message).toContain("SUPABASE_SECRET_KEY is not set");
      expect(message).toContain("EMAIL_PROVIDER");
    }
  });

  it("treats empty strings as not set", () => {
    expect(() => parseEnv(serverEnvSchema, { ...valid, SUPABASE_SECRET_KEY: "" })).toThrow(
      /SUPABASE_SECRET_KEY is not set/
    );
  });

  it("rejects a malformed URL", () => {
    expect(() => parseEnv(serverEnvSchema, { ...valid, NEXT_PUBLIC_SUPABASE_URL: "localhost" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/
    );
  });

  describe("captcha", () => {
    const captcha = { NEXT_PUBLIC_CAPTCHA_PROVIDER: "turnstile", NEXT_PUBLIC_CAPTCHA_SITE_KEY: "1x00000000000000000000AA" };

    it("is optional", () => {
      expect(parseEnv(publicEnvSchema, valid)).not.toHaveProperty("NEXT_PUBLIC_CAPTCHA_PROVIDER");
    });

    it("accepts a provider with a site key", () => {
      expect(parseEnv(serverEnvSchema, { ...valid, ...captcha })).toEqual({ ...valid, ...captcha });
    });

    it("requires the site key when a provider is set", () => {
      expect(() => parseEnv(publicEnvSchema, { ...valid, NEXT_PUBLIC_CAPTCHA_PROVIDER: "hcaptcha" })).toThrow(
        /NEXT_PUBLIC_CAPTCHA_SITE_KEY is required when NEXT_PUBLIC_CAPTCHA_PROVIDER is set/
      );
    });

    it("rejects an unknown provider", () => {
      expect(() => parseEnv(publicEnvSchema, { ...valid, ...captcha, NEXT_PUBLIC_CAPTCHA_PROVIDER: "recaptcha" })).toThrow(
        /NEXT_PUBLIC_CAPTCHA_PROVIDER/
      );
    });
  });

  describe("email", () => {
    it("needs host and port for SMTP", () => {
      expect(() => parseEnv(serverEnvSchema, { ...valid, EMAIL_PROVIDER: "smtp", SMTP_HOST: "127.0.0.1" })).toThrow(
        /SMTP_HOST and SMTP_PORT are required when EMAIL_PROVIDER is smtp/
      );
      expect(parseEnv(serverEnvSchema, { ...valid, EMAIL_PROVIDER: "smtp", SMTP_HOST: "127.0.0.1", SMTP_PORT: "54425" })).toMatchObject({
        SMTP_PORT: 54425,
      });
    });

    it("needs an API key for Resend", () => {
      expect(() => parseEnv(serverEnvSchema, { ...valid, EMAIL_PROVIDER: "resend" })).toThrow(
        /RESEND_API_KEY is required when EMAIL_PROVIDER is resend/
      );
    });

    it("accepts hook secrets in the Standard Webhooks format, several while rotating", () => {
      const secret = "v1,whsec_dGVzdC1zZWNyZXQ=";

      expect(parseEnv(serverEnvSchema, { ...valid, SEND_EMAIL_HOOK_SECRET: `${secret}|${secret}` })).toHaveProperty("SEND_EMAIL_HOOK_SECRET");
      expect(() => parseEnv(serverEnvSchema, { ...valid, SEND_EMAIL_HOOK_SECRET: "whsec_dGVzdA==" })).toThrow(/SEND_EMAIL_HOOK_SECRET/);
    });
  });
});
