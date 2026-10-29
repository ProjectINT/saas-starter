import type { MessageKey } from "@/core/i18n/translate";
import type { Permission } from "@/core/tenancy/permissions.generated";
import { appNavigation, appSettingsSections } from "@/modules";

// Extension points of the account frame: the tabs of every tenant page and
// the sections of its settings. The core lists its own; a product adds its
// items in modules/index.ts instead of editing this file.

/** A tab of the account navigation. */
export interface AccountNavItem {
  /** Path inside the account: "" for its home, "members", "projects". */
  segment: string;
  /** Full message key, e.g. "Navigation.members" or "Projects.nav". */
  label: MessageKey;
  /** Shown only with this permission; the page checks it again. */
  permission?: Permission;
}

/** A section of /[account]/settings. */
export interface SettingsSection {
  /** /[account]/settings/<segment>, a page under app/(app)/[account]/settings. */
  segment: string;
  /** personal: the signed-in user (same in every account); account: this account. */
  group: "personal" | "account";
  label: MessageKey;
  permission?: Permission;
}

/** Home first, then the product's tabs, then members and settings. */
export const ACCOUNT_NAVIGATION: readonly AccountNavItem[] = [
  { segment: "", label: "Navigation.overview" },
  ...appNavigation,
  { segment: "members", label: "Navigation.members", permission: "members.view" },
  { segment: "settings", label: "Navigation.settings" },
];

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { segment: "profile", group: "personal", label: "Settings.sections.profile" },
  { segment: "preferences", group: "personal", label: "Settings.sections.preferences" },
  { segment: "account", group: "account", label: "Settings.sections.account", permission: "account.update" },
  ...appSettingsSections,
];

/** Items the user may see: without a permission, or with one they hold. */
export const visibleItems = <T extends { permission?: Permission }>(items: readonly T[], can: (permission: Permission) => boolean) =>
  items.filter((item) => !item.permission || can(item.permission));
