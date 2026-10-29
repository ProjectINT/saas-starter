"use client";

import type { Key } from "react";
import type { MemberItem, MembersForm } from "../members-store";
import type { PalistorRef } from "palistor";

import { Ellipsis } from "@gravity-ui/icons";
import { Avatar, Button, Chip, Dropdown, Label, Separator, Skeleton } from "@heroui/react";
import { useForm } from "palistor";

import { ConfirmDialog } from "@/core/ui/confirm-dialog";
import { LoadError } from "@/core/ui/load-error";

import { ROLE_LABELS, assignableRoles, isAccountRole, outranks } from "../roles";

import { useAccount } from "./account-provider";

type Action = MembersForm["action"];

/** The roster with an action menu per member. */
export function MembersList({ members, action }: { members: MembersForm["members"]; action: Action }) {
  const list = useForm(members);

  if (list.error) {
    return (
      <LoadError onRetry={list.reload}>
        Could not load the members.
      </LoadError>
    );
  }

  // Every member sees at least themselves: empty means not loaded yet.
  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-surface">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-2/3 rounded-xl" />
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface shadow-surface">
      {list.map((member, _index, id) => (
        <MemberRow
          key={id}
          action={action}
          isReloading={list.loading}
          member={member}
        />
      ))}
    </ul>
  );
}

const ROLE_KEY_PREFIX = "role:";

function MemberRow({ member, action, isReloading }: { member: PalistorRef<MemberItem>; action: Action; isReloading: boolean }) {
  const { account, role: myRole, userId: myId, can } = useAccount();
  const m = useForm(member);
  const a = useForm(action);
  const name = m.name.value;
  const role = m.role.value;
  const email = m.email.value;

  // Mirrors the RPC rules (31_members.sql) to show only what would succeed.
  const isMe = m.id === myId;
  const iAmOwner = account.owner_id === myId;
  const canManage = !isMe && can("members.manage") && outranks(myRole, role);
  const newRoles = canManage ? assignableRoles(myRole).filter((item) => item !== role) : [];
  const canTransfer = iAmOwner && !isMe;
  const canLeave = isMe && !iAmOwner;
  const isActing = a.submitting && a.targetId.value === m.id;

  function handleAction(key: Key) {
    const choice = String(key);

    if (choice === "remove" || choice === "transfer") {
      a.setValues({ type: choice, targetId: m.id, targetName: name });

      return;
    }

    if (choice === "leave") {
      a.setValues({ type: choice, targetId: m.id, targetName: account.name });

      return;
    }

    const newRole = choice.slice(ROLE_KEY_PREFIX.length);

    if (isAccountRole(newRole)) {
      a.setValues({ type: "role", targetId: m.id, targetName: name, role: newRole });
      void a.submit();
    }
  }

  return (
    <li className="flex items-center gap-3 p-4">
      <Avatar size="sm">
        <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {name}
          {isMe && <span className="text-muted"> (you)</span>}
        </span>
        {email && email !== name && <span className="truncate text-sm text-muted">{email}</span>}
      </div>
      <Chip
        size="sm"
        variant="secondary"
      >
        {ROLE_LABELS[role]}
      </Chip>
      {canManage || canTransfer || canLeave
        ? (
          <Dropdown>
            <Button
              isIconOnly
              aria-label={`Actions for ${name}`}
              isDisabled={(a.submitting || isReloading) && !isActing}
              isPending={isActing}
              size="sm"
              variant="ghost"
            >
              <Ellipsis className="size-4" />
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu onAction={handleAction}>
                {newRoles.map((item) => (
                  <Dropdown.Item
                    key={item}
                    id={`${ROLE_KEY_PREFIX}${item}`}
                    textValue={`Make ${ROLE_LABELS[item]}`}
                  >
                    <Label>Make {ROLE_LABELS[item].toLowerCase()}</Label>
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
    </li>
  );
}

/** Confirmations for the actions that cannot be undone. Open while the action store holds one of them. */
export function MemberActionDialogs({ action }: { action: Action }) {
  const { account } = useAccount();
  const a = useForm(action);
  const type = a.type.value;
  const name = a.targetName.value;
  // Closing keeps the target, so the text does not change while the dialog fades out.
  const handleOpenChange = (isOpen: boolean) => !isOpen && a.setValues({ type: "" });
  const confirm = () => void a.submit();

  return (
    <>
      <ConfirmDialog
        confirmLabel="Remove"
        isOpen={type === "remove"}
        isPending={a.submitting}
        title={`Remove ${name}?`}
        onConfirm={confirm}
        onOpenChange={handleOpenChange}
      >
        <p>They lose access to {account.name} right away. Only a new invitation brings them back.</p>
      </ConfirmDialog>
      <ConfirmDialog
        confirmLabel="Transfer ownership"
        isOpen={type === "transfer"}
        isPending={a.submitting}
        status="warning"
        title={`Make ${name} the owner?`}
        onConfirm={confirm}
        onOpenChange={handleOpenChange}
      >
        <p>
          {name} becomes the owner of {account.name} and you become an admin. Only the new owner can transfer it back.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        confirmLabel="Leave"
        isOpen={type === "leave"}
        isPending={a.submitting}
        title={`Leave ${account.name}?`}
        onConfirm={confirm}
        onOpenChange={handleOpenChange}
      >
        <p>You lose access to {account.name} right away. Only a new invitation brings you back.</p>
      </ConfirmDialog>
    </>
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
