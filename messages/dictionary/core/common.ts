import type { DictionarySection } from "../types.ts";

export const Common = {
  cancel: { word: "Cancel" },
  done: { word: "Done" },
  tryAgain: { word: "Try again" },
  backToSignIn: { word: "Back to sign in" },
  signOut: { word: "Sign out" },
  email: { word: "Email", context: "Label of an email address field" },
  language: { word: "Language", context: "Label of the language switcher button" },
  lightTheme: { word: "Switch to light theme", context: "Label of the theme toggle button" },
  darkTheme: { word: "Switch to dark theme", context: "Label of the theme toggle button" },
} satisfies DictionarySection;

export const Site = {
  description: { word: "Next.js + Supabase multi-tenant SaaS starter", context: "Page description for search engines and the sign-in panel" },
  tagline: { word: "Everything your team needs, in one workspace.", context: "Large slogan on the sign-in page" },
} satisfies DictionarySection;

export const Roles = {
  owner: { word: "Owner", tip: "Role name: the one person who owns the account", context: "Role badge" },
  admin: { word: "Admin", tip: "Role name: manages members and settings", context: "Role badge" },
  member: { word: "Member", tip: "Role name: regular participant", context: "Role badge" },
} satisfies DictionarySection;

export const Navigation = {
  account: { word: "Account", context: "Label of the tab bar inside an account, for screen readers" },
  overview: { word: "Overview", context: "Tab: account home page" },
  members: { word: "Members", context: "Tab: list of people in the account" },
} satisfies DictionarySection;

export const Validation = {
  emailRequired: { word: "Enter an email address." },
  emailInvalid: { word: "Enter a valid email address." },
  passwordTooShort: { word: "Use at least {min, plural, one {# character} other {# characters}}." },
  passwordLettersDigits: { word: "Use both letters and digits.", tip: "Letters means Latin letters" },
  passwordHint: { word: "Use at least {min, plural, one {# character} other {# characters}} with letters and digits.", context: "Hint under a new password field" },
  passwordMismatch: { word: "Passwords do not match." },
  accountNameRequired: { word: "Enter the account name." },
  textTooLong: { word: "Use at most {max, plural, one {# character} other {# characters}}." },
  slugTooShort: { word: "Use at least {min, plural, one {# character} other {# characters}}." },
  slugFormat: { word: "Use lowercase letters, digits and hyphens; start and end with a letter or digit.", tip: "Letters means Latin letters a-z" },
  slugHint: { word: "Lowercase letters, digits and hyphens, {min}-{max} characters.", tip: "Letters means Latin letters a-z", context: "Hint under the account URL field" },
} satisfies DictionarySection;

export const Errors = {
  title: { word: "Something went wrong", context: "Heading of the error page" },
  description: { word: "This page could not be shown. Try again; if it keeps happening, come back later." },
  reference: { word: "Error reference: {digest}", tip: "{digest} is a technical code the user can quote to support" },
  notFoundTitle: { word: "Page not found", context: "Heading of the 404 page" },
  notFound: { word: "The page does not exist, or you don't have access to it." },
  home: { word: "Go to the start page", context: "Button on error pages" },
} satisfies DictionarySection;

export const RpcErrors = {
  not_authenticated: { word: "Your session has ended. Sign in again." },
  not_allowed: { word: "You don't have permission to do that." },
  member_not_found: { word: "This person is not a member of the account." },
  invalid_role: { word: "This role can't be given." },
  owner_cannot_leave: { word: "The owner can't leave the account. Transfer ownership first." },
  already_member: { word: "This person is already a member." },
  invitation_not_found: { word: "This invitation doesn't exist or is addressed to another email." },
  invitation_closed: { word: "This invitation has already been used or withdrawn." },
  invitation_expired: { word: "This invitation has expired. Ask for a new one." },
  account_invitations_email_format: { word: "Enter a valid email address." },
  fallback: { word: "Something went wrong. Try again." },
} satisfies DictionarySection;
