import { describe, expect, it } from "vitest";

import { EnvError, parseEnv, publicEnvSchema, serverEnvSchema } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54421",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
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
});
