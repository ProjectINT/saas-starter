import type { Metadata } from "next";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { SignOutButton } from "@/core/auth/components/sign-out-button";
import { withNext } from "@/core/auth/redirect";
import { requireClaims } from "@/core/auth/session";
import { invitePath, routes } from "@/core/config/routes";
import { InvitationResponse } from "@/core/tenancy/components/invitation-buttons";
import { getInvitation } from "@/core/tenancy/members";
import { ROLE_LABELS } from "@/core/tenancy/roles";
import { ButtonLink } from "@/core/ui/links";

export const metadata: Metadata = { title: "Invitation" };

type Props = { params: Promise<{ token: string }> };

const CLOSED: Record<string, { title: string; description: string }> = {
  accepted: { title: "Invitation already used", description: "This invitation has been accepted." },
  declined: { title: "Invitation declined", description: "This invitation was declined. Ask for a new one to join." },
  revoked: { title: "Invitation withdrawn", description: "This invitation is no longer valid. Ask for a new one to join." },
  expired: { title: "Invitation expired", description: "Invitations are valid for 7 days. Ask for a new one to join." },
};

/**
 * Target of the invitation link. proxy.ts sends signed-out visitors to sign-in
 * with `next` pointing back here. Accepting requires the invited email.
 */
export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const [claims, invitation] = await Promise.all([requireClaims(), getInvitation(token)]);

  if (!invitation) {
    return (
      <InviteMessage
        description="The link is invalid, or the account no longer exists."
        title="Invitation not found"
      />
    );
  }

  const closed = CLOSED[invitation.status];

  if (closed) {
    return <InviteMessage {...closed} />;
  }

  // Supabase stores emails in lowercase, like the invitation.
  if (claims.email?.toLowerCase() !== invitation.email) {
    return (
      <>
        <AuthHeading
          description={`You are signed in as ${claims.email}. Sign in with ${invitation.email} to accept.`}
          title={`This invitation is for ${invitation.email}`}
        />
        <SignOutButton
          redirectTo={withNext(routes.signIn, invitePath(token))}
          variant="secondary"
        />
      </>
    );
  }

  return (
    <>
      <AuthHeading
        description={`${invitation.inviter_name ?? "A member"} invited you to join with the ${ROLE_LABELS[invitation.role]} role.`}
        title={`Join ${invitation.account_name}`}
      />
      <InvitationResponse
        fullWidth
        invitationId={invitation.id}
      />
    </>
  );
}

function InviteMessage({ title, description }: { title: string; description: string }) {
  return (
    <>
      <AuthHeading
        description={description}
        title={title}
      />
      <ButtonLink
        fullWidth
        href={routes.accounts}
        variant="secondary"
      >
        Go to your accounts
      </ButtonLink>
    </>
  );
}
