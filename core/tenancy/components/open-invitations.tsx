"use client";

import type { InvitationItem, MembersForm } from "../members-store";
import type { PalistorRef } from "palistor";

import { Button, Chip } from "@heroui/react";
import { useForm } from "palistor";

import { LoadError } from "@/core/ui/load-error";

import { ROLE_LABELS } from "../roles";

type Action = MembersForm["action"];

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** Invitations of the account that are still open, for members with members.invite. Hidden while there are none. */
export function OpenInvitations({ invitations, action }: { invitations: MembersForm["invitations"]; action: Action }) {
  const list = useForm(invitations);

  if (list.error) {
    return (
      <LoadError onRetry={list.reload}>
        Could not load the pending invitations.
      </LoadError>
    );
  }

  if (list.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Pending invitations</h2>
      <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface shadow-surface">
        {list.map((invitation, _index, id) => (
          <InvitationRow
            key={id}
            action={action}
            invitation={invitation}
          />
        ))}
      </ul>
    </section>
  );
}

function InvitationRow({ invitation, action }: { invitation: PalistorRef<InvitationItem>; action: Action }) {
  const item = useForm(invitation);
  const a = useForm(action);
  const email = item.email.value;
  const isExpired = item.isExpired.value;
  const isRevoking = a.submitting && a.type.value === "revoke" && a.targetId.value === item.id;

  function revoke() {
    a.setValues({ type: "revoke", targetId: item.id, targetName: email });
    void a.submit();
  }

  return (
    <li className="flex items-center gap-3 p-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{email}</span>
        <span className="text-sm text-muted">
          {isExpired ? "Expired" : "Expires"} {dateFormat.format(new Date(item.expiresAt.value))}
        </span>
      </div>
      <Chip
        color={isExpired ? "warning" : "default"}
        size="sm"
        variant="secondary"
      >
        {ROLE_LABELS[item.role.value]}
      </Chip>
      <Button
        isDisabled={a.submitting && !isRevoking}
        isPending={isRevoking}
        size="sm"
        variant="ghost"
        onPress={revoke}
      >
        Revoke
      </Button>
    </li>
  );
}
