import { getTranslations } from "next-intl/server";

import { AuthHeading } from "@/core/auth/components/auth-heading";
import { ResetPasswordForm } from "@/core/auth/components/reset-password-form";
import { requireClaims } from "@/core/auth/session";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("resetPassword");

// Not public: the recovery link (/auth/confirm) signs the user in first.
export default async function ResetPasswordPage() {
  const [claims, t] = await Promise.all([requireClaims(), getTranslations("Auth.resetPassword")]);

  return (
    <>
      <AuthHeading
        description={claims.email ? t("description", { email: claims.email }) : undefined}
        title={t("title")}
      />
      <ResetPasswordForm />
    </>
  );
}
