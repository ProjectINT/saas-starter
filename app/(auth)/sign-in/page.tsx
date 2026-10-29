import type { Metadata } from "next";

import { SignInView } from "@/core/auth/components/sign-in-view";
import { getEnabledOAuthProviders } from "@/core/auth/oauth";
import { safeNextPath } from "@/core/auth/redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNextPath((await searchParams).next);

  return (
    <SignInView
      next={next}
      providers={await getEnabledOAuthProviders()}
    />
  );
}
