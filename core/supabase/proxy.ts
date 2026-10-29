import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/core/config/public-env";
import type { Database } from "@/core/db/database.types";

/**
 * Refreshes the auth session on every request and forwards the updated
 * cookies to both Server Components (request) and the browser (response).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // No-cache headers: a CDN must never serve one user's session cookies to another.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // Do not put code between createServerClient() and getClaims().
  // getClaims() verifies the JWT locally (asymmetric signing keys) and
  // refreshes an expired session; skipping it logs users out at random.
  // Route protection (redirect to sign-in, 401 for /api) will branch on the
  // returned claims once the auth pages exist (phase 2).
  await supabase.auth.getClaims();

  // Return `response` as is. If you need another response object, copy
  // response.cookies into it, or the browser and server sessions drift apart.
  return response;
}
