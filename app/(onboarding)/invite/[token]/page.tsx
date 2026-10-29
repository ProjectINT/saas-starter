import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { SignOutButton } from "@/core/auth/components/sign-out-button";
import { withNext } from "@/core/auth/redirect";
import { requireClaims } from "@/core/auth/session";
import { invitePath, routes } from "@/core/config/routes";
import { pageMetadata } from "@/core/i18n/metadata";
import { InvitationResponse } from "@/core/tenancy/components/invitation-response";
import { getInvitation } from "@/core/tenancy/invitations";
import { ButtonLink } from "@/core/ui/links";

export const generateMetadata = pageMetadata("invitation");

type Props = { params: Promise<{ token: string }> };

const CLOSED = {
  accepted: { title: "acceptedTitle", description: "accepted" },
  declined: { title: "declinedTitle", description: "declinedBody" },
  revoked: { title: "revokedTitle", description: "revoked" },
  expired: { title: "expiredTitle", description: "expired" },
} as const;

const isClosed = (status: string): status is keyof typeof CLOSED => Object.hasOwn(CLOSED, status);

/**
 * Target of the invitation link. proxy.ts sends signed-out visitors to sign-in
 * with `next` pointing back here. Accepting requires the invited email.
 */
export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const [claims, invitation, t] = await Promise.all([requireClaims(), getInvitation(token), getTranslations()]);

  if (!invitation) {
    return (
      <InviteMessage
        description={t("Invitations.notFound")}
        goLabel={t("Invitations.goToAccounts")}
        title={t("Invitations.notFoundTitle")}
      />
    );
  }

  if (isClosed(invitation.status)) {
    const { title, description } = CLOSED[invitation.status];

    return (
      <InviteMessage
        description={t(`Invitations.${description}`)}
        goLabel={t("Invitations.goToAccounts")}
        title={t(`Invitations.${title}`)}
      />
    );
  }

  // Supabase stores emails in lowercase, like the invitation.
  if (claims.email?.toLowerCase() !== invitation.email) {
    return (
      <>
        <AuthHeading
          description={t("Invitations.wrongEmail", { current: claims.email ?? "", email: invitation.email })}
          title={t("Invitations.wrongEmailTitle", { email: invitation.email })}
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
        description={t("Invitations.join", {
          inviter: invitation.inviter_name ?? t("Invitations.someone"),
          role: t(`Roles.${invitation.role}`),
        })}
        title={t("Invitations.joinTitle", { account: invitation.account_name })}
      />
      <InvitationResponse
        fullWidth
        invitationId={invitation.id}
      />
    </>
  );
}

function InviteMessage({ title, description, goLabel }: { title: string; description: string; goLabel: string }) {
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
        {goLabel}
      </ButtonLink>
    </>
  );
}
