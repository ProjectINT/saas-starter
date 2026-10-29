import type { Metadata } from "next";

import { ChevronRight, Plus } from "@gravity-ui/icons";
import NextLink from "next/link";
import { redirect } from "next/navigation";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { accountPath, routes } from "@/core/config/routes";
import { listMyAccounts } from "@/core/tenancy/accounts";
import { ButtonLink } from "@/core/ui/links";

export const metadata: Metadata = { title: "Choose an account" };

const ROLE_LABELS = { owner: "Owner", admin: "Admin", member: "Member" };

/** Where sign-in lands: no accounts -> onboarding, one -> straight in, several -> pick one. */
export default async function AccountsPage() {
  const memberships = await listMyAccounts();

  if (memberships.length === 0) {
    redirect(routes.onboarding);
  }

  if (memberships.length === 1) {
    redirect(accountPath(memberships[0].account.slug));
  }

  return (
    <>
      <AuthHeading
        description="You are a member of several accounts."
        title="Choose an account"
      />
      <ul className="flex flex-col gap-2">
        {memberships.map(({ account, role }) => (
          <li key={account.id}>
            <NextLink
              className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-surface transition-colors hover:bg-default"
              href={accountPath(account.slug)}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{account.name}</span>
                <span className="text-sm text-muted">{ROLE_LABELS[role] ?? role}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </NextLink>
          </li>
        ))}
      </ul>
      <ButtonLink
        fullWidth
        href={routes.onboarding}
        variant="tertiary"
      >
        <Plus className="size-4" />
        Create another account
      </ButtonLink>
    </>
  );
}
