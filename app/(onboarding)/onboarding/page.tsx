import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { routes } from "@/core/config/routes";
import { pageMetadata } from "@/core/i18n/metadata";
import { listMyAccounts } from "@/core/tenancy/accounts";
import { CreateAccountForm } from "@/core/tenancy/components/create-account-form";
import { AppLink } from "@/core/ui/links";

export const generateMetadata = pageMetadata("onboarding");

export default async function OnboardingPage() {
  const [memberships, requestHeaders, t] = await Promise.all([listMyAccounts(), headers(), getTranslations("Accounts.create")]);
  const hasAccounts = memberships.length > 0;

  return (
    <>
      <AuthHeading
        description={t("description")}
        title={hasAccounts ? t("titleAnother") : t("titleFirst")}
      />
      <CreateAccountForm urlPrefix={`${requestHeaders.get("host") ?? ""}/`} />
      {hasAccounts && (
        <p className="text-center text-sm text-muted">
          <AppLink href={routes.accounts}>{t("back")}</AppLink>
        </p>
      )}
    </>
  );
}
