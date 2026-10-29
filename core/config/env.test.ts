import { describe, expect, it } from "vitest";

import { EnvError, parseEnv, serverEnvSchema } from "./env";

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
});
