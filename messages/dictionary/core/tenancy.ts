import type { DictionarySection } from "../types.ts";

// "Account" is the shared workspace of a team (a tenant), not a user's login.

export const Accounts = {
  picker: {
    title: { word: "Choose an account" },
    invitedTitle: { word: "You have an invitation" },
    several: { word: "You are a member of several accounts." },
    joinOrOpen: { word: "Join an account you were invited to, or open one of yours." },
    joinOrCreate: { word: "Join the account you were invited to, or create your own." },
    invitations: { word: "Invitations", context: "Section heading" },
    yourAccounts: { word: "Your accounts", context: "Section heading" },
    invitedBy: { word: "{role} · invited by {name}", tip: "{role} is a role name like Admin; {name} is a person", context: "Under an invitation" },
    createAnother: { word: "Create another account", context: "Button" },
    createOwn: { word: "Create your own account", context: "Button" },
  },

  switcher: {
    label: { word: "Switch account", context: "Menu label for screen readers" },
    create: { word: "Create account", context: "Menu item" },
  },

  create: {
    titleFirst: { word: "Create your first account" },
    titleAnother: { word: "Create another account" },
    description: { word: "An account is the shared space for your team: members, settings and data." },
    back: { word: "Back to your accounts", context: "Link" },
    name: { word: "Account name", context: "Field label" },
    namePlaceholder: { word: "Acme Inc.", tip: "An example company name, may stay as is" },
    url: { word: "URL", context: "Field label: the web address of the account" },
    urlPlaceholder: { word: "acme", tip: "Example address part: lowercase Latin letters only" },
    submit: { word: "Create account", context: "Button" },
    slugTaken: { word: "This URL is already taken." },
    slugReserved: { word: "This URL is reserved. Choose another one." },
    nameInvalid: { word: "Enter a name of up to {max, plural, one {# character} other {# characters}}." },
    failed: { word: "Could not create the account. Try again." },
  },

  home: {
    role: { word: "Your role: {role}" },
    placeholder: { word: "The account dashboard goes here.", context: "Placeholder on the account home page of the template" },
  },
} satisfies DictionarySection;

export const Members = {
  title: { word: "Members", context: "Page heading" },
  description: { word: "People with access to {account}.", tip: "{account} is the account name" },
  loadFailed: { word: "Could not load the members." },
  you: { word: "(you)", context: "After the current user's name in the member list" },
  unknownUser: { word: "Unknown user", context: "Shown when a member has neither a name nor an email" },
  actionsFor: { word: "Actions for {name}", context: "Menu button label for screen readers" },
  changeRole: { word: "Change role to {role}", tip: "{role} is a role name like Admin", context: "Menu item" },
  transfer: { word: "Transfer ownership", context: "Menu item and confirmation button" },
  remove: { word: "Remove from account", context: "Menu item" },
  leave: { word: "Leave account", context: "Menu item" },

  removeTitle: { word: "Remove {name}?" },
  removeBody: { word: "They lose access to {account} right away. Only a new invitation brings them back." },
  removeConfirm: { word: "Remove", context: "Confirmation button" },
  transferTitle: { word: "Make {name} the owner?" },
  transferBody: { word: "{name} becomes the owner of {account} and you become an admin. Only the new owner can transfer it back." },
  leaveTitle: { word: "Leave {account}?" },
  leaveBody: { word: "You lose access to {account} right away. Only a new invitation brings you back." },
  leaveConfirm: { word: "Leave", context: "Confirmation button: leave the account" },

  roleChanged: { word: "{name} now has the {role} role.", tip: "{role} is a role name like Admin" },
  removed: { word: "{name} was removed from the account." },
  transferred: { word: "{name} is now the owner." },
  left: { word: "You left {account}." },
  revoked: { word: "Invitation for {email} revoked." },

  invite: {
    open: { word: "Invite member", context: "Button" },
    title: { word: "Invite to {account}", context: "Dialog heading" },
    emailPlaceholder: { word: "colleague@example.com", tip: "Example email address; keep it an address" },
    role: { word: "Role", context: "Field label" },
    submit: { word: "Create invitation", context: "Button" },
    createdTitle: { word: "Invitation created", context: "Dialog heading" },
    created: { word: "Send this link to {email}. It works for 7 days, only for that email address, and is shown only once." },
    link: { word: "Invitation link", context: "Field label for screen readers" },
    copy: { word: "Copy link", context: "Button label for screen readers" },
    copied: { word: "Link copied." },
    copyFailed: { word: "Could not copy. Select the link and copy it by hand." },
    another: { word: "Invite another", context: "Button" },
  },

  pending: {
    title: { word: "Pending invitations", context: "Section heading" },
    loadFailed: { word: "Could not load the pending invitations." },
    expires: { word: "Expires {date}", tip: "{date} is a formatted date like Oct 30, 2026" },
    expired: { word: "Expired {date}", tip: "{date} is a formatted date like Oct 30, 2026" },
    revoke: { word: "Revoke", context: "Button: withdraw the invitation" },
  },
} satisfies DictionarySection;

export const Invitations = {
  accept: { word: "Accept", context: "Button: accept the invitation" },
  decline: { word: "Decline", context: "Button: decline the invitation" },
  joined: { word: "You joined {account}." },
  declined: { word: "Invitation declined." },
  goToAccounts: { word: "Go to your accounts", context: "Button" },
  notFoundTitle: { word: "Invitation not found" },
  notFound: { word: "The link is invalid, or the account no longer exists." },
  acceptedTitle: { word: "Invitation already used" },
  accepted: { word: "This invitation has been accepted." },
  declinedTitle: { word: "Invitation declined" },
  declinedBody: { word: "This invitation was declined. Ask for a new one to join." },
  revokedTitle: { word: "Invitation withdrawn" },
  revoked: { word: "This invitation is no longer valid. Ask for a new one to join." },
  expiredTitle: { word: "Invitation expired" },
  expired: { word: "Invitations are valid for 7 days. Ask for a new one to join." },
  wrongEmailTitle: { word: "This invitation is for {email}" },
  wrongEmail: { word: "You are signed in as {current}. Sign in with {email} to accept." },
  joinTitle: { word: "Join {account}" },
  join: { word: "{inviter} invited you to join with the {role} role.", tip: "{inviter} is a person; {role} is a role name like Admin" },
  someone: { word: "A member", context: "Stands for the inviter when their name is unknown: \"A member invited you…\"" },
} satisfies DictionarySection;
