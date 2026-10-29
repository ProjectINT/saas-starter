import { z } from "zod";

/**
 * Environment contract. The app refuses to start without it:
 * next.config.ts calls assertServerEnv() on `next dev`, `next build` and `next start`.
 *
 * Read values through publicEnv (client + server) or serverEnv (server only).
 * This module has no side effects so next.config.ts can import it.
 */

const publicEnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Optional captcha on sign-in, sign-up and password reset. Supabase Auth
  // verifies the token, so it must be enabled there too ([auth.captcha]).
  NEXT_PUBLIC_CAPTCHA_PROVIDER: z.enum(["turnstile", "hcaptcha"]).optional(),
  NEXT_PUBLIC_CAPTCHA_SITE_KEY: z.string().min(1).optional(),
  // Version attached to error reports; on Vercel the commit SHA by default.
  NEXT_PUBLIC_APP_RELEASE: z.string().min(1).optional(),
};

type CaptchaEnv = {
  NEXT_PUBLIC_CAPTCHA_PROVIDER?: string;
  NEXT_PUBLIC_CAPTCHA_SITE_KEY?: string;
};

const captchaSiteKeyIsSet = (env: CaptchaEnv) => !env.NEXT_PUBLIC_CAPTCHA_PROVIDER || !!env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
const captchaSiteKeyIssue = {
  path: ["NEXT_PUBLIC_CAPTCHA_SITE_KEY"],
  message: "is required when NEXT_PUBLIC_CAPTCHA_PROVIDER is set",
};

export const publicEnvSchema = z.object(publicEnvShape).refine(captchaSiteKeyIsSet, captchaSiteKeyIssue);

export const serverEnvSchema = z
  .object({
    ...publicEnvShape,
    SUPABASE_SECRET_KEY: z.string().min(1),
  })
  .refine(captchaSiteKeyIsSet, captchaSiteKeyIssue);

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

type EnvIssue = z.ZodError["issues"][number];

export class EnvError extends Error {
  constructor(issues: EnvIssue[]) {
    super(formatIssues(issues));
    this.name = "EnvError";
  }
}

function formatIssues(issues: EnvIssue[]) {
  const lines = issues.map((issue) => {
    const reason = issue.code === "invalid_type" ? "is not set" : issue.message;

    return `  - ${issue.path.join(".")} ${reason}`;
  });

  return [
    "Invalid environment variables:",
    ...lines,
    "Copy .env.example to .env.local and fill it in.",
    "For the local Supabase stack: npm run db:start && npm run env:local",
  ].join("\n");
}

export function parseEnv<T extends z.ZodType>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  // `KEY=` lines in .env files produce empty strings; treat them as not set.
  const values = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""));
  const result = schema.safeParse(values);

  if (!result.success) {
    throw new EnvError(result.error.issues);
  }

  return result.data;
}

export function assertServerEnv() {
  parseEnv(serverEnvSchema, process.env);
}
