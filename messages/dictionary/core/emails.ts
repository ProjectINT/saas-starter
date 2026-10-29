import type { DictionarySection } from "../types.ts";

// Emails the app sends (core/email). Server-only namespace: never sent to the
// browser. Every text is plain: no tags, the renderer escapes it for HTML.

export const Emails = {
  layout: {
    linkFallback: { word: "If the button does not work, copy this link into your browser:", context: "Under the email's button, before the plain URL" },
    footer: { word: "This email was sent by {site} to {email}.", tip: "{site} is the product name" },
  },
  linkExpiry: { word: "The link works once and expires in {hours, plural, one {an hour} other {# hours}}." },
  codeExpiry: { word: "The code works once and expires in {hours, plural, one {an hour} other {# hours}}." },

  invitation: {
    subject: { word: "{inviter} invited you to {account}", tip: "{inviter} is a person, {account} a team workspace name", context: "Email subject" },
    heading: { word: "Join {account}" },
    body: { word: "{inviter} invited you to join {account} on {site} with the {role} role.", tip: "{site} is the product name; {role} a role name like Admin" },
    action: { word: "Accept invitation", context: "Email button" },
    validity: { word: "The invitation is valid for {days, plural, one {# day} other {# days}} and only for {email}." },
    ignore: { word: "If you did not expect this invitation, ignore this email." },
  },

  welcome: {
    subject: { word: "Welcome to {site}", tip: "{site} is the product name", context: "Email subject" },
    heading: { word: "Welcome to {site}" },
    body: { word: "Your profile is ready. Create an account for your team, or join one you were invited to.", tip: "An account here is a shared team workspace" },
    action: { word: "Open {site}", context: "Email button" },
  },

  confirmSignup: {
    subject: { word: "Confirm your email", context: "Email subject" },
    heading: { word: "Confirm your email" },
    body: { word: "Follow the link to confirm {email} and finish signing up for {site}." },
    action: { word: "Confirm email", context: "Email button" },
    ignore: { word: "If you did not sign up, ignore this email." },
  },

  magicLink: {
    subject: { word: "Your sign-in link for {site}", context: "Email subject" },
    heading: { word: "Sign in to {site}" },
    body: { word: "Follow the link to sign in as {email}." },
    action: { word: "Sign in", context: "Email button" },
    ignore: { word: "If you did not ask for it, ignore this email." },
  },

  recovery: {
    subject: { word: "Reset your password", context: "Email subject" },
    heading: { word: "Reset your password" },
    body: { word: "Follow the link to set a new password for {email}." },
    action: { word: "Set a new password", context: "Email button" },
    ignore: { word: "If you did not ask for it, ignore this email: your password stays the same." },
  },

  authInvite: {
    subject: { word: "You are invited to {site}", context: "Email subject" },
    heading: { word: "Join {site}" },
    body: { word: "You were invited to sign up for {site} with {email}." },
    action: { word: "Accept invitation", context: "Email button" },
    ignore: { word: "If you did not expect this invitation, ignore this email." },
  },

  emailChange: {
    subject: { word: "Confirm your new email", context: "Email subject" },
    heading: { word: "Confirm the email change" },
    body: { word: "Follow the link to change your {site} email from {currentEmail} to {newEmail}." },
    action: { word: "Confirm the change", context: "Email button" },
    ignore: { word: "If you did not ask for this change, ignore this email and consider changing your password." },
  },

  reauthentication: {
    subject: { word: "Your confirmation code", context: "Email subject" },
    heading: { word: "Confirm it's you" },
    body: { word: "Enter this code in {site} to confirm the change." },
    ignore: { word: "If you did not ask for it, change your password." },
  },
} satisfies DictionarySection;
