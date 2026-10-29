import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getAccountContext } from "@/core/tenancy/accounts";
import { ROLE_LABELS } from "@/core/tenancy/roles";

// Placeholder tenant home. A product renders its dashboard here.

type Props = { params: Promise<{ account: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { account: slug } = await params;
  const context = await getAccountContext(slug);

  return { title: context?.account.name };
}

export default async function AccountHomePage({ params }: Props) {
  const { account: slug } = await params;
  // The layout already 404s for non-members; this keeps the page safe on its own.
  const context = await getAccountContext(slug);

  if (!context) {
    notFound();
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{context.account.name}</h1>
        <p className="text-muted">Your role: {ROLE_LABELS[context.role]}</p>
      </div>
      <p className="text-muted">The account dashboard goes here.</p>
    </>
  );
}
