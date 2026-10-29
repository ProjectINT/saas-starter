import type messages from "../../messages/en.json";
import type { Locale as AppLocale } from "./config";

// Typed message keys: t("Members.title") is checked against messages/en.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
