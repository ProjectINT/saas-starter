"use client";

import { Button, toast } from "@heroui/react";
import { useState, useTransition } from "react";

import { acceptInvitation, declineInvitation } from "../invitation-actions";
import { revokeInvitation } from "../member-actions";

/** Accept / Decline for the invitee. Both navigate on success. */
export function InvitationResponse({ invitationId, fullWidth }: { invitationId: string; fullWidth?: boolean }) {
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [, startTransition] = useTransition();

  function respond(action: "accept" | "decline") {
    setPending(action);
    startTransition(async () => {
      const error = await (action === "accept" ? acceptInvitation : declineInvitation)(invitationId);

      if (error) {
        toast.danger(error);
        setPending(null);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        fullWidth={fullWidth}
        isDisabled={pending !== null}
        isPending={pending === "accept"}
        size={fullWidth ? "md" : "sm"}
        onPress={() => respond("accept")}
      >
        Accept
      </Button>
      <Button
        fullWidth={fullWidth}
        isDisabled={pending !== null}
        isPending={pending === "decline"}
        size={fullWidth ? "md" : "sm"}
        variant="tertiary"
        onPress={() => respond("decline")}
      >
        Decline
      </Button>
    </div>
  );
}

/** Withdraws an open invitation (members.invite). */
export function RevokeInvitationButton({ invitationId, email }: { invitationId: string; email: string }) {
  const [isPending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const error = await revokeInvitation(invitationId);

      if (error) {
        toast.danger(error);
      } else {
        toast.success(`Invitation for ${email} revoked.`);
      }
    });
  }

  return (
    <Button
      isPending={isPending}
      size="sm"
      variant="ghost"
      onPress={revoke}
    >
      Revoke
    </Button>
  );
}
