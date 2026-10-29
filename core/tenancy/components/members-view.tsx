"use client";

import { useRouter } from "next/navigation";
import { useForm, useStoreContext } from "palistor";
import { useState } from "react";

import { createMembersStore, type MembersContext } from "../members-store";

import { useAccount } from "./account-provider";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberActionDialogs, MembersList } from "./members-list";
import { OpenInvitations } from "./open-invitations";

/** The members page: roster, pending invitations and the invite dialog, all on one store. */
export function MembersView() {
  const { account, can } = useAccount();
  const router = useRouter();
  const [store] = useState(createMembersStore);
  const canInvite = can("members.invite");

  // The lists load once the account id is in the context, i.e. after mount in the browser.
  useStoreContext(store, { accountId: account.id, router } satisfies MembersContext);

  const form = useForm(store);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted">People with access to {account.name}.</p>
        </div>
        {canInvite && <InviteMemberDialog invite={form.invite} />}
      </div>
      <MembersList
        action={form.action}
        members={form.members}
      />
      {canInvite && (
        <OpenInvitations
          action={form.action}
          invitations={form.invitations}
        />
      )}
      <MemberActionDialogs action={form.action} />
    </>
  );
}
