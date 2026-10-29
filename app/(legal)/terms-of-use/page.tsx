import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/core/config/site";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("termsOfUse");

// Placeholder texts (Legal.terms in the dictionary). Replace them with terms
// reviewed by a lawyer before launch.
export default async function TermsOfUsePage() {
  const t = await getTranslations("Legal.terms");

  return (
    <>
      <h1>{t("title")}</h1>
      <p className="text-muted">{t("placeholder")}</p>
      <h2>{t("serviceTitle")}</h2>
      <p>{t("service", { site: siteConfig.name })}</p>
      <h2>{t("accountsTitle")}</h2>
      <p>{t("accounts")}</p>
      <h2>{t("contactTitle")}</h2>
      <p>{t("contact")}</p>
    </>
  );
}
