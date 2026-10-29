import type { ReactNode } from "react";

import { AuthShell } from "@/core/auth/components/auth-shell";
import { SignOutButton } from "@/core/auth/components/sign-out-button";
import { requireClaims } from "@/core/auth/session";

// Signed-in pages outside an account: account selection and onboarding.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const claims = await requireClaims();

  return (
    <AuthShell
      headerEnd={(
        <>
          <span className="hidden truncate text-sm text-muted sm:inline">{claims.email}</span>
          <SignOutButton />
        </>
      )}
    >
      {children}
    </AuthShell>
  );
}
