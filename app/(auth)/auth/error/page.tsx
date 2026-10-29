import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { routes } from "@/core/config/routes";
import { pageMetadata } from "@/core/i18n/metadata";
import { ButtonLink } from "@/core/ui/links";

export const generateMetadata = pageMetadata("authError");

// Only known reasons are shown; text from the query string is never echoed.
export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const [{ reason }, t] = await Promise.all([searchParams, getTranslations()]);
  const kind = reason === "link" ? "linkError" : "callbackError";

  return (
    <>
      <AuthHeading
        description={t(`Auth.${kind}.description`)}
        title={t(`Auth.${kind}.title`)}
      />
      <div className="flex flex-col gap-2">
        <ButtonLink
          fullWidth
          href={routes.signIn}
        >
          {t("Common.backToSignIn")}
        </ButtonLink>
        <ButtonLink
          fullWidth
          href={routes.forgotPassword}
          variant="ghost"
        >
          {t("Auth.resetPasswordLink")}
        </ButtonLink>
      </div>
    </>
  );
}
