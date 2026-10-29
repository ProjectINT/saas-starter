import type { DictionarySection } from "../types.ts";

// /[account]/settings. "Account" is the team workspace; the user's own data is
// their profile.

export const Settings = {
  title: { word: "Settings", context: "Page heading" },
  groups: {
    personal: { word: "You", context: "Heading of the settings about the signed-in person" },
    account: { word: "This account", context: "Heading of the settings of the current team workspace" },
  },
  sections: {
    profile: { word: "Profile", context: "Settings section" },
    preferences: { word: "Preferences", context: "Settings section: theme, language, time zone" },
    account: { word: "Account", context: "Settings section of the team workspace" },
  },
  saveFailed: { word: "Could not save. Try again." },
  save: { word: "Save", context: "Button" },

  profile: {
    nameTitle: { word: "Name", context: "Card heading" },
    nameDescription: { word: "Shown to the members of your accounts." },
    firstName: { word: "First name" },
    lastName: { word: "Last name" },
    nameSaved: { word: "Your name has been saved." },
    emailTitle: { word: "Email", context: "Card heading" },
    emailDescription: { word: "You sign in with {email} and receive emails there." },
    newEmail: { word: "New email", context: "Field label" },
    changeEmail: { word: "Change email", context: "Button" },
    emailSame: { word: "This is already your email." },
    emailSent: { word: "We sent confirmation links to {current} and {next}. The change takes effect once both are confirmed." },
    emailPending: { word: "Waiting for the change to {email} to be confirmed from both inboxes." },
    passwordTitle: { word: "Password", context: "Card heading" },
    passwordDescription: { word: "Change the password you sign in with." },
    newPassword: { word: "New password" },
    confirmPassword: { word: "Confirm new password" },
    changePassword: { word: "Change password", context: "Button" },
    passwordChanged: { word: "Your password has been changed." },
  },

  preferences: {
    themeTitle: { word: "Theme", context: "Card heading" },
    themeDescription: { word: "Saved in this browser." },
    themeLight: { word: "Light", context: "Theme option" },
    themeDark: { word: "Dark", context: "Theme option" },
    themeSystem: { word: "Same as the device", context: "Theme option: follow the operating system" },
    languageTitle: { word: "Language", context: "Card heading" },
    languageDescription: { word: "For the interface and the emails we send you." },
    timeZoneTitle: { word: "Time zone", context: "Card heading" },
    timeZoneDescription: { word: "Dates and times are shown in this zone." },
    timeZone: { word: "Time zone", context: "Field label" },
    useDeviceTimeZone: { word: "Use {timeZone}", tip: "{timeZone} is a zone name like Europe/Berlin", context: "Button: take the device's time zone" },
    noTimeZones: { word: "No matching time zone", context: "Empty search result" },
    saved: { word: "Saved." },
  },

  account: {
    generalTitle: { word: "General", context: "Card heading" },
    generalDescription: { word: "The name and web address of the account." },
    saved: { word: "Account settings saved." },
    urlChanged: { word: "Links to the old address stop working." },
    deleteTitle: { word: "Delete account", context: "Card heading and button" },
    deleteDescription: { word: "Deletes {account} for everyone, with its members, invitations and data. This cannot be undone." },
    deleteConfirmTitle: { word: "Delete {account}?" },
    deleteConfirmBody: { word: "Everything in the account is deleted permanently. Type {slug} to confirm.", tip: "{slug} is the account's web address part, keep it as is" },
    deleteConfirmLabel: { word: "Account URL", context: "Field label for screen readers" },
    deleteConfirmMismatch: { word: "Type the account URL exactly." },
    deleted: { word: "{account} was deleted." },
  },
} satisfies DictionarySection;
