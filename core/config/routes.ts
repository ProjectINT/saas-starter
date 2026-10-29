/**
 * Top-level paths of the core. Tenant pages live under /[account] (the account
 * slug); keep accounts_slug_not_reserved in supabase/schemas/21_accounts.sql in
 * sync when adding a top-level route.
 */
export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authCallback: "/auth/callback",
  authConfirm: "/auth/confirm",
  authError: "/auth/error",
  accounts: "/accounts",
  onboarding: "/onboarding",
  invite: "/invite",
  privacyPolicy: "/privacy-policy",
  termsOfUse: "/terms-of-use",
} as const;

export const accountPath = (slug: string) => `/${slug}`;

export const accountMembersPath = (slug: string) => `/${slug}/members`;

export const invitePath = (token: string) => `${routes.invite}/${token}`;
