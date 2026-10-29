import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/core/config/public-env";
import type { Database } from "@/core/db/database.types";

/** Supabase client for Client Components. Returns a singleton in the browser. */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
