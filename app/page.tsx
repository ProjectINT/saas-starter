import type { ReactNode } from "react";

import { publicEnv } from "@/core/config/public-env";
import { createClient } from "@/core/supabase/server";

// Phase 1 status page: proves the Next.js <-> Supabase wiring.
// Replaced by the sign-in / dashboard flow in phase 2.

async function checkAuthHealth() {
  try {
    const response = await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store",
    });

    return response.ok ? "reachable" : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : "unreachable";
  }
}

export default async function StatusPage() {
  const supabase = await createClient();
  const [authHealth, { data: claimsData }] = await Promise.all([checkAuthHealth(), supabase.auth.getClaims()]);
  const claims = claimsData?.claims;

  // RLS also returns co-members of accounts with members.view, so filter to own rows.
  const { data: memberships, error: membershipsError } = claims
    ? await supabase.from("account_members").select("role, account:accounts (slug, name)").eq("user_id", claims.sub)
    : { data: null, error: null };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">SaaS Starter</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <Row label="Supabase URL">{publicEnv.NEXT_PUBLIC_SUPABASE_URL}</Row>
        <Row label="Auth">{authHealth}</Row>
        <Row label="Session">{claims ? `${claims.email ?? claims.sub}` : "not signed in"}</Row>
        {claims && (
          <Row label="Accounts">
            {membershipsError
              ? membershipsError.message
              : memberships?.map(({ role, account }) => `${account.name} (${account.slug}, ${role})`).join(", ") || "none"}
          </Row>
        )}
      </dl>
    </main>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-mono break-all">{children}</dd>
    </>
  );
}
