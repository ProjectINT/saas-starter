import type { DictionarySection } from "../types.ts";

// /admin: the operators of the product (platform admins), not account admins.

export const Admin = {
  title: { word: "Admin", context: "Header of the platform admin area" },
  navLabel: { word: "Admin sections", context: "Navigation label for screen readers" },
  backToApp: { word: "Back to the app", context: "Link" },
  search: { word: "Search", context: "Button" },
  results: { word: "{count, plural, =0 {Nothing found} one {# result} other {# results}}" },
  previous: { word: "Previous", context: "Pager button" },
  next: { word: "Next", context: "Pager button" },
  page: { word: "Page {page} of {pages}" },
  loadFailed: { word: "Could not load the list." },
  created: { word: "Created {date}", tip: "{date} is a formatted date" },

  accounts: {
    title: { word: "Accounts", context: "Page heading and tab" },
    searchPlaceholder: { word: "Name, URL or owner email" },
    owner: { word: "Owner: {email}" },
    members: { word: "{count, plural, one {# member} other {# members}}" },
    active: { word: "Active", context: "Status chip" },
    deactivated: { word: "Deactivated", context: "Status chip" },
    deactivate: { word: "Deactivate", context: "Button" },
    reactivate: { word: "Reactivate", context: "Button" },
    deactivateTitle: { word: "Deactivate {account}?" },
    deactivateBody: { word: "Its members lose access at once. The data stays, and you can reactivate the account later." },
    deactivatedToast: { word: "{account} was deactivated." },
    reactivated: { word: "{account} was reactivated." },
  },

  users: {
    title: { word: "Users", context: "Page heading and tab" },
    searchPlaceholder: { word: "Email or name" },
    accounts: { word: "{count, plural, =0 {No accounts} one {# account} other {# accounts}}" },
    platformAdmin: { word: "Platform admin", context: "Badge" },
    unconfirmed: { word: "Email not confirmed", context: "Badge" },
    blocked: { word: "Blocked", context: "Status chip" },
    block: { word: "Block", context: "Button: prevent the user from signing in" },
    unblock: { word: "Unblock", context: "Button" },
    blockTitle: { word: "Block {email}?" },
    blockBody: { word: "They cannot sign in until unblocked, and are signed out within an hour." },
    blockedToast: { word: "{email} was blocked." },
    unblockedToast: { word: "{email} was unblocked." },
    cannotBlockSelf: { word: "You cannot block yourself." },
    lastSignIn: { word: "Last sign-in {date}", tip: "{date} is a formatted date" },
    neverSignedIn: { word: "Never signed in" },
  },
} satisfies DictionarySection;
