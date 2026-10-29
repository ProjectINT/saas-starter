import type { DictionarySection } from "../types.ts";

// Server-only namespaces (see SERVER_NAMESPACES in core/i18n/messages.ts):
// page titles and legal texts never reach the browser bundle.

export const Metadata = {
  signIn: { word: "Sign in", context: "Browser tab title" },
  signUp: { word: "Sign up", context: "Browser tab title" },
  forgotPassword: { word: "Reset password", context: "Browser tab title" },
  resetPassword: { word: "Set a new password", context: "Browser tab title" },
  authError: { word: "Sign-in problem", context: "Browser tab title" },
  accounts: { word: "Choose an account", context: "Browser tab title" },
  onboarding: { word: "Create an account", context: "Browser tab title" },
  invitation: { word: "Invitation", context: "Browser tab title" },
  members: { word: "Members", context: "Browser tab title" },
  settingsProfile: { word: "Profile", context: "Browser tab title" },
  settingsPreferences: { word: "Preferences", context: "Browser tab title" },
  settingsAccount: { word: "Account settings", context: "Browser tab title" },
  adminAccounts: { word: "Accounts · Admin", context: "Browser tab title" },
  adminUsers: { word: "Users · Admin", context: "Browser tab title" },
  privacyPolicy: { word: "Privacy Policy", context: "Browser tab title" },
  termsOfUse: { word: "Terms of Use", context: "Browser tab title" },
} satisfies DictionarySection;

// Placeholders: replace with texts reviewed for your product before launch.
export const Legal = {
  privacy: {
    title: { word: "Privacy Policy" },
    placeholder: { word: "Placeholder text. Replace it with the privacy policy of your product." },
    collectTitle: { word: "1. Data we collect" },
    collect: { word: "{site} stores your email address, profile details and the data you add to your accounts.", tip: "{site} is the product name" },
    useTitle: { word: "2. How we use it" },
    use: { word: "To provide the service, secure your account and contact you about it." },
    contactTitle: { word: "3. Contact" },
    contact: { word: "Privacy questions: add your contact address here." },
  },
  terms: {
    title: { word: "Terms of Use" },
    placeholder: { word: "Placeholder text. Replace it with the terms of your product." },
    serviceTitle: { word: "1. Service" },
    service: { word: "{site} provides a hosted service. These terms govern your use of it.", tip: "{site} is the product name" },
    accountsTitle: { word: "2. Accounts" },
    accounts: { word: "You are responsible for your account, its members and the activity in it." },
    contactTitle: { word: "3. Contact" },
    contact: { word: "Questions about these terms: add your contact address here." },
  },
} satisfies DictionarySection;
