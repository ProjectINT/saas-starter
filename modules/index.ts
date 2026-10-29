import type { AccountNavItem, SettingsSection } from "@/core/navigation/registry";

import { exampleNavigation } from "./example";

// What the product's modules add to the core's extension points. Labels are
// message keys of the product dictionary (messages/dictionary/app). The
// template registers its example module here; remove it with the module.

/** Tabs between the account home and Members, in this order. */
export const appNavigation: AccountNavItem[] = [...exampleNavigation];

/** Settings sections after the core ones; `group: "account"` for account-wide settings. */
export const appSettingsSections: SettingsSection[] = [];
