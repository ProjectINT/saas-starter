import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { SignOutButton } from "@/core/auth/components/sign-out-button";
import { routes } from "@/core/config/routes";
import { getAccountBySlug } from "@/core/tenancy/accounts";
import { BrandLogo } from "@/core/ui/brand-logo";
import { ButtonLink } from "@/core/ui/links";
import { ThemeSwitch } from "@/core/ui/theme-switch";
import { validateSlug } from "@/core/validation/slug";

// Placeholder tenant home: proves the sign-in -> account flow. Phase 3 adds the
// account layout (switcher, navigation) and members.

type Props = { params: Promise<{ account: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { account: slug } = await params;
  const account = validateSlug(slug) ? null : await getAccountBySlug(slug);

  return { title: account?.name };
}

export default async function AccountHomePage({ params }: Props) {
  const { account: slug } = await params;
  // RLS returns the account only to its members, so non-members get a 404 too.
  const account = validateSlug(slug) ? null : await getAccountBySlug(slug);

  if (!account) {
    notFound();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between gap-4 border-b border-separator px-4 sm:px-6">
        <BrandLogo />
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12">
        <h1 className="text-2xl font-semibold">{account.name}</h1>
        <p className="text-muted">The account dashboard goes here.</p>
        <ButtonLink
          className="self-start"
          href={routes.accounts}
          variant="secondary"
        >
          Switch account
        </ButtonLink>
      </main>
    </div>
  );
}
