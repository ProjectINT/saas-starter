import { pageMetadata } from "@/core/i18n/metadata";
import { PreferencesSettings } from "@/core/settings/components/preferences-settings";

export const generateMetadata = pageMetadata("settingsPreferences");

/** Theme, language and time zone of the signed-in user. */
export default function PreferencesSettingsPage() {
  return <PreferencesSettings />;
}
