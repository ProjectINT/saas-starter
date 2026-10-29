import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/core/config/server-env";
import type { Database } from "@/core/db/database.types";

/**
 * Service-role client: bypasses RLS. Server only, and only after the caller's
 * rights have been checked. Prefer RPCs that check permissions in the database.
 */
export function createAdminClient() {
  return createClient<Database>(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
