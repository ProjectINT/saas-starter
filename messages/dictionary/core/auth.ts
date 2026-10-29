import type { DictionarySection } from "../types.ts";

export const Auth = {
  emailPlaceholder: { word: "you@example.com", tip: "Example email address; keep it an address" },
  password: { word: "Password" },
  confirmPassword: { word: "Confirm password" },
  showPassword: { word: "Show password", context: "Button label for screen readers" },
  hidePassword: { word: "Hide password", context: "Button label for screen readers" },
  captchaFailed: { word: "The captcha could not load. Disable blockers for this site and reload the page." },
  continueWith: { word: "Continue with {provider}", tip: "{provider} is a brand: Google, GitHub", context: "Social sign-in button" },
  or: { word: "or", context: "Separator between social sign-in buttons and the email form" },

  signIn: {
    title: { word: "Welcome back" },
    description: { word: "Sign in to your account to continue." },
    forgotPassword: { word: "Forgot password?", context: "Link under the password field" },
    submit: { word: "Sign in", context: "Button" },
    noAccount: { word: "No account yet? <link>Sign up</link>", tip: "Keep the <link> tags around the action" },
    notConfirmedTitle: { word: "Confirm your email" },
    notConfirmed: { word: "Your email address is not confirmed yet. Open the link we sent to <strong>{email}</strong>, or request a new one." },
  },

  signUp: {
    title: { word: "Create your account" },
    description: { word: "Sign up to get started. It takes a minute." },
    terms: { word: "I agree to the <terms>Terms of Use</terms> and <privacy>Privacy Policy</privacy>", context: "Checkbox label; the tags become links" },
    submit: { word: "Create account", context: "Button" },
    haveAccount: { word: "Already have an account? <link>Sign in</link>" },
    sentTitle: { word: "Check your email" },
    sent: { word: "We sent a confirmation link to <strong>{email}</strong>. Open it to finish signing up." },
  },

  checkEmail: {
    resend: { word: "Resend email", context: "Button" },
    resent: { word: "A new link is on its way to {email}." },
  },

  forgotPassword: {
    title: { word: "Forgot your password?" },
    description: { word: "Enter your email and we will send you a link to set a new password." },
    submit: { word: "Send reset link", context: "Button" },
    remembered: { word: "Remembered it? <link>Back to sign in</link>" },
    sentTitle: { word: "Check your email" },
    sent: { word: "If an account exists for <strong>{email}</strong>, we sent it a link to set a new password. The link expires in an hour." },
  },

  resetPassword: {
    title: { word: "Set a new password" },
    description: { word: "For {email}.", context: "Under the title: whose password is being changed" },
    newPassword: { word: "New password" },
    confirmPassword: { word: "Confirm new password" },
    submit: { word: "Update password", context: "Button" },
    updated: { word: "Your password has been updated." },
  },

  linkError: {
    title: { word: "This link has expired" },
    description: { word: "Email links work once and expire after an hour. Request a new one and use the latest email." },
  },
  callbackError: {
    title: { word: "Sign-in was not completed" },
    description: { word: "The sign-in was cancelled or the link was opened in a different browser. Try again from this browser." },
  },
  resetPasswordLink: { word: "Reset password", context: "Button on the sign-in error page" },

  // Supabase Auth error codes: https://supabase.com/docs/guides/auth/debugging/error-codes
  errors: {
    invalid_credentials: { word: "Invalid email or password." },
    email_not_confirmed: { word: "Confirm your email address first." },
    user_already_exists: { word: "An account with this email already exists." },
    weak_password: { word: "This password is too weak. Use at least {min, plural, one {# character} other {# characters}} with letters and digits." },
    same_password: { word: "The new password must be different from the current one." },
    email_address_invalid: { word: "This email address cannot be used." },
    signup_disabled: { word: "Sign-ups are currently disabled." },
    user_banned: { word: "This account is blocked. Contact support." },
    captcha_failed: { word: "The captcha check failed. Try again." },
    over_request_rate_limit: { word: "Too many attempts. Wait a few minutes and try again." },
    over_email_send_rate_limit: { word: "Too many emails sent. Wait a few minutes and try again." },
    session_expired: { word: "Your session has expired. Sign in again." },
    reauthentication_needed: { word: "Sign in again to change your password." },
    network: { word: "Cannot reach the server. Check your connection and try again." },
    unknown: { word: "Something went wrong. Try again." },
  },
} satisfies DictionarySection;
