import { SignUpView } from "@/core/auth/components/sign-up-view";
import { getEnabledOAuthProviders } from "@/core/auth/oauth";
import { safeNextPath } from "@/core/auth/redirect";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("signUp");

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNextPath((await searchParams).next);

  return (
    <SignUpView
      next={next}
      providers={await getEnabledOAuthProviders()}
    />
  );
}
