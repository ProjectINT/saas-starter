import type { Metadata } from "next";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { routes } from "@/core/config/routes";
import { ButtonLink } from "@/core/ui/links";

export const metadata: Metadata = { title: "Sign-in problem" };

// Only known reasons are shown; text from the query string is never echoed.
const REASONS = {
  link: {
    title: "This link has expired",
    description: "Email links work once and expire after an hour. Request a new one and use the latest email.",
  },
  callback: {
    title: "Sign-in was not completed",
    description: "The sign-in was cancelled or the link was opened in a different browser. Try again from this browser.",
  },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const { title, description } = reason === "link" ? REASONS.link : REASONS.callback;

  return (
    <>
      <AuthHeading
        description={description}
        title={title}
      />
      <div className="flex flex-col gap-2">
        <ButtonLink
          fullWidth
          href={routes.signIn}
        >
          Back to sign in
        </ButtonLink>
        <ButtonLink
          fullWidth
          href={routes.forgotPassword}
          variant="ghost"
        >
          Reset password
        </ButtonLink>
      </div>
    </>
  );
}
