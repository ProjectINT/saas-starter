import { SignInView } from "@/core/auth/components/sign-in-view";
import { getEnabledOAuthProviders } from "@/core/auth/oauth";
import { safeNextPath } from "@/core/auth/redirect";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("signIn");

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNextPath((await searchParams).next);

  return (
    <SignInView
      next={next}
      providers={await getEnabledOAuthProviders()}
    />
  );
}
