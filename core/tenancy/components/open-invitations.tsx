import type { AccountRole } from "../roles";

import { Chip } from "@heroui/react";

import { ROLE_LABELS } from "../roles";

import { RevokeInvitationButton } from "./invitation-buttons";

interface OpenInvitation {
  id: string;
  email: string;
  role: AccountRole;
  expires_at: string;
  isExpired: boolean;
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** Invitations of an account that are still open, for members with members.invite. */
export function OpenInvitations({ invitations }: { invitations: OpenInvitation[] }) {
  return (
    <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface shadow-surface">
      {invitations.map((invitation) => {
        const { isExpired } = invitation;

        return (
          <li
            key={invitation.id}
            className="flex items-center gap-3 p-4"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{invitation.email}</span>
              <span className="text-sm text-muted">
                {isExpired ? "Expired" : "Expires"} {dateFormat.format(new Date(invitation.expires_at))}
              </span>
            </div>
            <Chip
              color={isExpired ? "warning" : "default"}
              size="sm"
              variant="secondary"
            >
              {ROLE_LABELS[invitation.role]}
            </Chip>
            <RevokeInvitationButton
              email={invitation.email}
              invitationId={invitation.id}
            />
          </li>
        );
      })}
    </ul>
  );
}
