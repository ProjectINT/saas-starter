import type { Metadata } from "next";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { ResetPasswordForm } from "@/core/auth/components/reset-password-form";
import { requireClaims } from "@/core/auth/session";

export const metadata: Metadata = { title: "Set a new password" };

// Not public: the recovery link (/auth/confirm) signs the user in first.
export default async function ResetPasswordPage() {
  const claims = await requireClaims();

  return (
    <>
      <AuthHeading
        description={claims.email ? `For ${claims.email}.` : undefined}
        title="Set a new password"
      />
      <ResetPasswordForm />
    </>
  );
}
