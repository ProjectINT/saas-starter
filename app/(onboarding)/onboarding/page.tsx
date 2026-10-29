import type { Metadata } from "next";

import { headers } from "next/headers";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { routes } from "@/core/config/routes";
import { listMyAccounts } from "@/core/tenancy/accounts";
import { CreateAccountForm } from "@/core/tenancy/components/create-account-form";
import { AppLink } from "@/core/ui/links";

export const metadata: Metadata = { title: "Create an account" };

export default async function OnboardingPage() {
  const [memberships, requestHeaders] = await Promise.all([listMyAccounts(), headers()]);
  const hasAccounts = memberships.length > 0;

  return (
    <>
      <AuthHeading
        description="An account is the shared space for your team: members, settings and data."
        title={hasAccounts ? "Create another account" : "Create your first account"}
      />
      <CreateAccountForm urlPrefix={`${requestHeaders.get("host") ?? ""}/`} />
      {hasAccounts && (
        <p className="text-center text-sm text-muted">
          <AppLink href={routes.accounts}>Back to your accounts</AppLink>
        </p>
      )}
    </>
  );
}
