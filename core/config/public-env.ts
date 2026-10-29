import { parseEnv, publicEnvSchema, type PublicEnv } from "./env";

// Next.js inlines NEXT_PUBLIC_* into the client bundle only for literal
// `process.env.NAME` reads, so every key is spelled out here.
export const publicEnv: PublicEnv = parseEnv(publicEnvSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
