import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { pageMetadata } from "@/core/i18n/metadata";
import { AccountSettings } from "@/core/settings/components/account-settings";
import { can, getAccountContext } from "@/core/tenancy/accounts";

export const generateMetadata = pageMetadata("settingsAccount");

type Props = { params: Promise<{ account: string }> };

/** Name, URL and deletion of the account. RLS and delete_account check the permissions again. */
export default async function AccountSettingsPage({ params }: Props) {
  const { account: slug } = await params;
  const context = await getAccountContext(slug);

  if (!context || !can(context, "account.update")) {
    notFound();
  }

  const host = (await headers()).get("host");

  return <AccountSettings urlPrefix={`${host ?? ""}/`} />;
}
