import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { can, getAccountContext } from "@/core/tenancy/accounts";
import { MembersView } from "@/core/tenancy/components/members-view";

export const metadata: Metadata = { title: "Members" };

type Props = { params: Promise<{ account: string }> };

/** The account roster. The data loads in the browser under RLS; this page only checks access. */
export default async function MembersPage({ params }: Props) {
  const { account: slug } = await params;
  const context = await getAccountContext(slug);

  if (!context || !can(context, "members.view")) {
    notFound();
  }

  return <MembersView />;
}
