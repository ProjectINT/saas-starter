import type { Metadata } from "next";

import { ChevronRight, Plus } from "@gravity-ui/icons";
import { cookies } from "next/headers";
import NextLink from "next/link";
import { redirect } from "next/navigation";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { accountPath, routes } from "@/core/config/routes";
import { listMyAccounts, listMyInvitations } from "@/core/tenancy/accounts";
import { InvitationResponse } from "@/core/tenancy/components/invitation-buttons";
import { LAST_ACCOUNT_COOKIE } from "@/core/tenancy/last-account";
import { ROLE_LABELS } from "@/core/tenancy/roles";
import { ButtonLink } from "@/core/ui/links";

export const metadata: Metadata = { title: "Choose an account" };

/**
 * Where sign-in and email links land. Pending invitations are always shown
 * here: a sign-up through an invitation link loses `next` on the way through
 * email confirmation. Otherwise: no accounts -> onboarding, the last opened
 * account (or the only one) -> straight in, several -> pick one.
 */
export default async function AccountsPage() {
  const [memberships, invitations, cookieStore] = await Promise.all([listMyAccounts(), listMyInvitations(), cookies()]);

  if (invitations.length === 0) {
    if (memberships.length === 0) {
      redirect(routes.onboarding);
    }

    const lastSlug = cookieStore.get(LAST_ACCOUNT_COOKIE)?.value;
    const target = memberships.find(({ account }) => account.slug === lastSlug) ?? (memberships.length === 1 ? memberships[0] : null);

    if (target) {
      redirect(accountPath(target.account.slug));
    }
  }

  return (
    <>
      <AuthHeading
        description={accountsDescription(invitations.length, memberships.length)}
        title={memberships.length > 0 ? "Choose an account" : "You have an invitation"}
      />
      {invitations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted">Invitations</h2>
          <ul className="flex flex-col gap-2">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-surface"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{invitation.account_name}</span>
                  <span className="text-sm text-muted">
                    {ROLE_LABELS[invitation.role]}
                    {invitation.inviter_name && ` · invited by ${invitation.inviter_name}`}
                  </span>
                </div>
                <InvitationResponse invitationId={invitation.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {memberships.length > 0 && (
        <section className="flex flex-col gap-2">
          {invitations.length > 0 && <h2 className="text-sm font-medium text-muted">Your accounts</h2>}
          <ul className="flex flex-col gap-2">
            {memberships.map(({ account, role }) => (
              <li key={account.id}>
                <NextLink
                  className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-surface transition-colors hover:bg-default"
                  href={accountPath(account.slug)}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{account.name}</span>
                    <span className="text-sm text-muted">{ROLE_LABELS[role]}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ButtonLink
        fullWidth
        href={routes.onboarding}
        variant="tertiary"
      >
        <Plus className="size-4" />
        {memberships.length > 0 ? "Create another account" : "Create your own account"}
      </ButtonLink>
    </>
  );
}

function accountsDescription(invitations: number, accounts: number) {
  if (invitations === 0) {
    return "You are a member of several accounts.";
  }

  return accounts > 0
    ? "Join an account you were invited to, or open one of yours."
    : "Join the account you were invited to, or create your own.";
}
