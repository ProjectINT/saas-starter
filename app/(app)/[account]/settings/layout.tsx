import type { ReactNode } from "react";

import { getTranslations } from "next-intl/server";

import { SettingsNav } from "@/core/settings/components/settings-nav";

/** Settings of the user and of the account: sections from the registry on the left, the section on the right. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("Settings");

  return (
    <>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <SettingsNav />
        <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
      </div>
    </>
  );
}
