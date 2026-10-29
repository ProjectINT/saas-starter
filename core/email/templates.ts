import type { Translate } from "@/core/i18n/translate";
import type { AccountRole } from "@/core/tenancy/roles";
import { siteConfig } from "@/core/config/site";

import { renderEmail, type EmailContent, type RenderedEmail } from "./render";

// The emails of the core, as plain functions of a translator in the
// recipient's language: `getTranslations({ locale })` on the server,
// `englishT` in tests. Texts are in the Emails namespace.

/** An email ready for sendEmail(): rendered, with its recipient. */
export interface ComposedEmail extends RenderedEmail {
  to: string;
}

/** Mirrors `[auth.email] otp_expiry` (seconds) in supabase/config.toml; hosted projects default to the same hour. */
export const AUTH_LINK_LIFETIME_HOURS = 1;

/** Mirrors `interval '7 days'` in private.create_invitation (supabase/schemas/32_invitations.sql). */
export const INVITATION_LIFETIME_DAYS = 7;

const site = siteConfig.name;

function compose(t: Translate, locale: string, to: string, content: EmailContent): ComposedEmail {
  return {
    to,
    ...renderEmail(content, {
      lang: locale,
      siteName: site,
      linkFallback: t("Emails.layout.linkFallback"),
      footer: t("Emails.layout.footer", { site, email: to }),
    }),
  };
}

export interface InvitationEmailData {
  to: string;
  accountName: string;
  /** Display name of the inviter; empty if unknown. */
  inviterName: string;
  role: AccountRole;
  /** Absolute /invite/<token> URL. */
  url: string;
}

export function invitationEmail(t: Translate, locale: string, { to, accountName, inviterName, role, url }: InvitationEmailData) {
  const inviter = inviterName || t("Invitations.someone");

  return compose(t, locale, to, {
    subject: t("Emails.invitation.subject", { inviter, account: accountName }),
    heading: t("Emails.invitation.heading", { account: accountName }),
    paragraphs: [t("Emails.invitation.body", { inviter, account: accountName, site, role: t(`Roles.${role}`) })],
    action: { label: t("Emails.invitation.action"), url },
    notes: [t("Emails.invitation.validity", { days: INVITATION_LIFETIME_DAYS, email: to }), t("Emails.invitation.ignore")],
  });
}

export function welcomeEmail(t: Translate, locale: string, { to, url }: { to: string; url: string }) {
  return compose(t, locale, to, {
    subject: t("Emails.welcome.subject", { site }),
    heading: t("Emails.welcome.heading", { site }),
    paragraphs: [t("Emails.welcome.body")],
    action: { label: t("Emails.welcome.action", { site }), url },
    notes: [],
  });
}

/** An email Supabase Auth asks the app to send (app/api/auth/send-email). */
export type AuthEmail =
  | { kind: "confirmSignup" | "magicLink" | "recovery" | "authInvite"; to: string; url: string }
  | { kind: "emailChange"; to: string; url: string; currentEmail: string; newEmail: string }
  | { kind: "reauthentication"; to: string; code: string };

export function authEmail(t: Translate, locale: string, email: AuthEmail) {
  const linkExpiry = t("Emails.linkExpiry", { hours: AUTH_LINK_LIFETIME_HOURS });

  switch (email.kind) {
    case "confirmSignup":
      return compose(t, locale, email.to, {
        subject: t("Emails.confirmSignup.subject"),
        heading: t("Emails.confirmSignup.heading"),
        paragraphs: [t("Emails.confirmSignup.body", { email: email.to, site })],
        action: { label: t("Emails.confirmSignup.action"), url: email.url },
        notes: [linkExpiry, t("Emails.confirmSignup.ignore")],
      });
    case "magicLink":
      return compose(t, locale, email.to, {
        subject: t("Emails.magicLink.subject", { site }),
        heading: t("Emails.magicLink.heading", { site }),
        paragraphs: [t("Emails.magicLink.body", { email: email.to })],
        action: { label: t("Emails.magicLink.action"), url: email.url },
        notes: [linkExpiry, t("Emails.magicLink.ignore")],
      });
    case "recovery":
      return compose(t, locale, email.to, {
        subject: t("Emails.recovery.subject"),
        heading: t("Emails.recovery.heading"),
        paragraphs: [t("Emails.recovery.body", { email: email.to })],
        action: { label: t("Emails.recovery.action"), url: email.url },
        notes: [linkExpiry, t("Emails.recovery.ignore")],
      });
    case "authInvite":
      return compose(t, locale, email.to, {
        subject: t("Emails.authInvite.subject", { site }),
        heading: t("Emails.authInvite.heading", { site }),
        paragraphs: [t("Emails.authInvite.body", { site, email: email.to })],
        action: { label: t("Emails.authInvite.action"), url: email.url },
        notes: [linkExpiry, t("Emails.authInvite.ignore")],
      });
    case "emailChange":
      return compose(t, locale, email.to, {
        subject: t("Emails.emailChange.subject"),
        heading: t("Emails.emailChange.heading"),
        paragraphs: [t("Emails.emailChange.body", { site, currentEmail: email.currentEmail, newEmail: email.newEmail })],
        action: { label: t("Emails.emailChange.action"), url: email.url },
        notes: [linkExpiry, t("Emails.emailChange.ignore")],
      });
    case "reauthentication":
      return compose(t, locale, email.to, {
        subject: t("Emails.reauthentication.subject"),
        heading: t("Emails.reauthentication.heading"),
        paragraphs: [t("Emails.reauthentication.body", { site })],
        code: email.code,
        notes: [t("Emails.codeExpiry", { hours: AUTH_LINK_LIFETIME_HOURS }), t("Emails.reauthentication.ignore")],
      });
  }
}
