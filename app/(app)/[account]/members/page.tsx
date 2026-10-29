import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { can, getAccountContext } from "@/core/tenancy/accounts";
import { InviteMemberDialog } from "@/core/tenancy/components/invite-member-dialog";
import { MembersList } from "@/core/tenancy/components/members-list";
import { OpenInvitations } from "@/core/tenancy/components/open-invitations";
import { listMembers, listOpenInvitations } from "@/core/tenancy/members";

export const metadata: Metadata = { title: "Members" };

type Props = { params: Promise<{ account: string }> };

export default async function MembersPage({ params }: Props) {
  const { account: slug } = await params;
  const context = await getAccountContext(slug);

  if (!context || !can(context, "members.view")) {
    notFound();
  }

  const canInvite = can(context, "members.invite");
  const [members, invitations] = await Promise.all([
    listMembers(context.account.id),
    canInvite ? listOpenInvitations(context.account.id) : [],
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted">People with access to {context.account.name}.</p>
        </div>
        {canInvite && <InviteMemberDialog />}
      </div>
      <MembersList members={members} />
      {invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Pending invitations</h2>
          <OpenInvitations invitations={invitations} />
        </section>
      )}
    </>
  );
}
