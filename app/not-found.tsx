import { getTranslations } from "next-intl/server";

import { routes } from "@/core/config/routes";
import { ErrorScreen } from "@/core/ui/error-screen";
import { ButtonLink } from "@/core/ui/links";

// Unknown URLs and notFound() calls, e.g. an account the user is not a member of.
export default async function NotFound() {
  const t = await getTranslations("Errors");

  return (
    <ErrorScreen
      description={t("notFound")}
      title={t("notFoundTitle")}
    >
      <ButtonLink href={routes.home}>{t("home")}</ButtonLink>
    </ErrorScreen>
  );
}
