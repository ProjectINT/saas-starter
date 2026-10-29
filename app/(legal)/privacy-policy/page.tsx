import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/core/config/site";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("privacyPolicy");

// Placeholder texts (Legal.privacy in the dictionary). Replace them with a
// policy that matches your data processing before launch.
export default async function PrivacyPolicyPage() {
  const t = await getTranslations("Legal.privacy");

  return (
    <>
      <h1>{t("title")}</h1>
      <p className="text-muted">{t("placeholder")}</p>
      <h2>{t("collectTitle")}</h2>
      <p>{t("collect", { site: siteConfig.name })}</p>
      <h2>{t("useTitle")}</h2>
      <p>{t("use")}</p>
      <h2>{t("contactTitle")}</h2>
      <p>{t("contact")}</p>
    </>
  );
}
