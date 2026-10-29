import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isGuestOnlyRoute, isPublicRoute } from "@/core/auth/public-routes";
import { safeNextPath } from "@/core/auth/redirect";
import { publicEnv } from "@/core/config/public-env";
import { routes } from "@/core/config/routes";
import type { Database } from "@/core/db/database.types";

/**
 * Refreshes the auth session on every request, forwards the updated cookies
 * to both Server Components (request) and the browser (response), and guards
 * routes:
 * - signed out, non-public page -> redirect to sign-in with `next`;
 * - signed out, /api            -> 401;
 * - signed in, sign-in/sign-up  -> redirect into the app (GET only).
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
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname, search, searchParams } = request.nextUrl;

  if (!isSignedIn && !isPublicRoute(pathname)) {
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return withSession(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), response);
    }

    const signIn = new URL(routes.signIn, request.url);

    signIn.searchParams.set("next", `${pathname}${search}`);

    return withSession(NextResponse.redirect(signIn), response);
  }

  // Page loads only: Server Actions POST to the page's own URL, and the
  // sign-in form calls one right after the session exists.
  if (isSignedIn && isGuestOnlyRoute(pathname) && request.method === "GET") {
    return withSession(NextResponse.redirect(new URL(safeNextPath(searchParams.get("next")), request.url)), response);
  }

  // Return `response` as is. Any other response must go through withSession(),
  // or the browser and server sessions drift apart.
  return response;
}

/** Copies refreshed session cookies and their no-cache headers onto another response. */
function withSession(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((name) => {
    const value = source.headers.get(name);

    if (value) {
      target.headers.set(name, value);
    }
  });

  return target;
}
