"use client";

import type { Key } from "react";
import type { MemberItem } from "../members";

import { Ellipsis } from "@gravity-ui/icons";
import { Avatar, Button, Chip, Dropdown, Label, Separator, toast } from "@heroui/react";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/core/ui/confirm-dialog";

import { changeMemberRole, leaveAccount, removeMember, transferOwnership } from "../member-actions";
import { ROLE_LABELS, assignableRoles, isAccountRole, outranks } from "../roles";

import { useAccount } from "./account-provider";

export function MembersList({ members }: { members: MemberItem[] }) {
  return (
    <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface shadow-surface">
      {members.map((member) => (
        <MemberRow
          key={member.userId}
          member={member}
        />
      ))}
    </ul>
  );
}

type Confirmation = "remove" | "transfer" | "leave";

const ROLE_KEY_PREFIX = "role:";

function MemberRow({ member }: { member: MemberItem }) {
  const { account, role: myRole, userId: myId, can } = useAccount();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [isPending, startTransition] = useTransition();

  // Mirrors the RPC rules (31_members.sql) to show only what would succeed.
  const isMe = member.userId === myId;
  const iAmOwner = account.owner_id === myId;
  const canManage = !isMe && can("members.manage") && outranks(myRole, member.role);
  const newRoles = canManage ? assignableRoles(myRole).filter((role) => role !== member.role) : [];
  const canTransfer = iAmOwner && !isMe;
  const canLeave = isMe && !iAmOwner;

  function handleAction(key: Key) {
    const action = String(key);

    if (action === "remove" || action === "transfer" || action === "leave") {
      setConfirmation(action);

      return;
    }

    const role = action.slice(ROLE_KEY_PREFIX.length);

    if (!isAccountRole(role)) {
      return;
    }

    startTransition(async () => {
      const error = await changeMemberRole(account.id, member.userId, role);

      if (error) {
        toast.danger(error);
      } else {
        toast.success(`${member.name} is now ${ROLE_LABELS[role].toLowerCase()}.`);
      }
    });
  }

  return (
    <li className="flex items-center gap-3 p-4">
      <Avatar size="sm">
        <Avatar.Fallback>{initials(member.name)}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {member.name}
          {isMe && <span className="text-muted"> (you)</span>}
        </span>
        {member.email && member.email !== member.name && <span className="truncate text-sm text-muted">{member.email}</span>}
      </div>
      <Chip
        size="sm"
        variant="secondary"
      >
        {ROLE_LABELS[member.role]}
      </Chip>
      {canManage || canTransfer || canLeave
        ? (
          <Dropdown>
            <Button
              isIconOnly
              aria-label={`Actions for ${member.name}`}
              isPending={isPending}
              size="sm"
              variant="ghost"
            >
              <Ellipsis className="size-4" />
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu onAction={handleAction}>
                {newRoles.map((role) => (
                  <Dropdown.Item
                    key={role}
                    id={`${ROLE_KEY_PREFIX}${role}`}
                    textValue={`Make ${ROLE_LABELS[role]}`}
                  >
                    <Label>Make {ROLE_LABELS[role].toLowerCase()}</Label>
                  </Dropdown.Item>
                ))}
                {canTransfer && (
                  <Dropdown.Item
                    id="transfer"
                    textValue="Transfer ownership"
                  >
                    <Label>Transfer ownership</Label>
                  </Dropdown.Item>
                )}
                {(newRoles.length > 0 || canTransfer) && (canManage || canLeave) && <Separator />}
                {canManage && (
                  <Dropdown.Item
                    id="remove"
                    textValue="Remove from account"
                    variant="danger"
                  >
                    <Label>Remove from account</Label>
                  </Dropdown.Item>
                )}
                {canLeave && (
                  <Dropdown.Item
                    id="leave"
                    textValue="Leave account"
                    variant="danger"
                  >
                    <Label>Leave account</Label>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )
        : <span className="size-8" />}
      <ConfirmDialog
        confirmLabel="Remove"
        isOpen={confirmation === "remove"}
        title={`Remove ${member.name}?`}
        onConfirm={() => removeMember(account.id, member.userId)}
        onOpenChange={(isOpen) => setConfirmation(isOpen ? "remove" : null)}
      >
        <p>They lose access to {account.name} right away. Only a new invitation brings them back.</p>
      </ConfirmDialog>
      <ConfirmDialog
        confirmLabel="Transfer ownership"
        isOpen={confirmation === "transfer"}
        status="warning"
        title={`Make ${member.name} the owner?`}
        onConfirm={() => transferOwnership(account.id, member.userId)}
        onOpenChange={(isOpen) => setConfirmation(isOpen ? "transfer" : null)}
      >
        <p>
          {member.name} becomes the owner of {account.name} and you become an admin. Only the new owner can transfer
          it back.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        confirmLabel="Leave"
        isOpen={confirmation === "leave"}
        title={`Leave ${account.name}?`}
        onConfirm={() => leaveAccount(account.id)}
        onOpenChange={(isOpen) => setConfirmation(isOpen ? "leave" : null)}
      >
        <p>You lose access to {account.name} right away. Only a new invitation brings you back.</p>
      </ConfirmDialog>
    </li>
  );
}

function initials(name: string) {
  const letters = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]);

  return letters.join("").toUpperCase() || "?";
}
