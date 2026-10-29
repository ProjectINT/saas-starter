import { redirect } from "next/navigation";

import { accountSettingsPath } from "@/core/config/routes";
import { SETTINGS_SECTIONS } from "@/core/navigation/registry";

type Props = { params: Promise<{ account: string }> };

/** /[account]/settings opens the first section, which every member may see. */
export default async function SettingsPage({ params }: Props) {
  const { account: slug } = await params;

  redirect(accountSettingsPath(slug, SETTINGS_SECTIONS[0].segment));
}
