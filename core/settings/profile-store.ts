import type { useRouter } from "next/navigation";
import type { ConfigProxy, TranslateFn } from "palistor";

import { toast } from "@heroui/react";
import { Palistor } from "palistor";

import type { Translate } from "@/core/i18n/translate";
import { authErrorMessage } from "@/core/auth/errors";
import { authCallbackUrl } from "@/core/auth/redirect";
import { accountSettingsPath } from "@/core/config/routes";
import { captureException } from "@/core/errors";
import { createClient } from "@/core/supabase/client";
import { normalizeEmail, validateEmail } from "@/core/validation/email";
import { validatePassword } from "@/core/validation/password";

// The profile settings: name (profiles, under RLS), email and password
// (Supabase Auth from the browser, like the sign-in screens).

/** What ProfileSettings puts into store.context. */
export interface ProfileContext {
  userId: string;
  /** The current account, to come back to these settings from the email link. */
  slug: string;
  router: ReturnType<typeof useRouter>;
  t: Translate;
}

export interface ProfileInitial {
  firstName: string;
  lastName: string;
  email: string;
}

interface NameValues {
  firstName: string;
  lastName: string;
  formError: string;
}

interface EmailValues {
  email: string;
  /** The address now, to refuse "changing" to it. */
  current: string;
  emailError: string;
  /** The new address once both confirmation emails are out. */
  sentTo: string;
}

interface PasswordValues {
  password: string;
  confirm: string;
  passwordError: string;
}

interface ProfileStoreApi {
  readonly context: ProfileContext;
  readonly proxy: { password: { reset(): void } };
  setValues(patch: { name?: Partial<NameValues>; email?: Partial<EmailValues>; password?: Partial<PasswordValues> }): void;
}

async function saveName(values: NameValues, store: ProfileStoreApi) {
  const { userId, router, t } = store.context;
  const { error } = await createClient()
    .from("profiles")
    .update({ first_name: values.firstName.trim() || null, last_name: values.lastName.trim() || null })
    .eq("id", userId);

  if (error) {
    captureException(error, { action: "saveName" });
    store.setValues({ name: { formError: t("Settings.saveFailed") } });

    return;
  }

  store.setValues({ name: { formError: "" } });
  toast.success(t("Settings.profile.nameSaved"));
  // Names are rendered on the server in member lists and invitations.
  router.refresh();
}

async function changeEmail(values: EmailValues, store: ProfileStoreApi) {
  const { slug, t } = store.context;
  const email = normalizeEmail(values.email);

  if (email === values.current) {
    store.setValues({ email: { emailError: t("Settings.profile.emailSame") } });

    return;
  }

  // Auth sends a link to both addresses ([auth.email] double_confirm_changes);
  // the links come back to these settings through /auth/confirm.
  const { error } = await createClient().auth.updateUser(
    { email },
    { emailRedirectTo: authCallbackUrl(accountSettingsPath(slug, "profile")) }
  );

  if (error) {
    store.setValues({ email: { emailError: authErrorMessage(error, t) } });

    return;
  }

  store.setValues({ email: { emailError: "", sentTo: email } });
}

async function changePassword(values: PasswordValues, store: ProfileStoreApi) {
  const { t } = store.context;
  const { error } = await createClient().auth.updateUser({ password: values.password });

  if (error) {
    store.setValues({ password: { passwordError: authErrorMessage(error, t) } });

    return;
  }

  toast.success(t("Settings.profile.passwordChanged"));
  store.proxy.password.reset();
}

const profileConfig = (initial: ProfileInitial) => ({
  name: {
    firstName: { value: initial.firstName, setter: () => ({ formError: "" }) },
    lastName: { value: initial.lastName, setter: () => ({ formError: "" }) },
    formError: { value: "" },
    onSubmit: saveName,
  },

  email: {
    email: {
      value: "",
      isRequired: true,
      validate: (value: string, values: EmailValues, t: TranslateFn) => values.emailError || validateEmail(value, t) || undefined,
      setter: () => ({ emailError: "", sentTo: "" }),
    },
    current: { value: initial.email },
    emailError: { value: "" },
    sentTo: { value: "" },
    onSubmit: changeEmail,
  },

  password: {
    password: {
      value: "",
      isRequired: true,
      validate: (value: string, values: PasswordValues, t: TranslateFn) => values.passwordError || validatePassword(value, t) || undefined,
      setter: () => ({ passwordError: "" }),
    },
    confirm: {
      value: "",
      isRequired: true,
      validate: (value: string, values: PasswordValues, t: TranslateFn) => (value === values.password ? undefined : t("Validation.passwordMismatch")),
    },
    passwordError: { value: "" },
    onSubmit: changePassword,
  },
});

/** One store per profile page, prefilled from the server. */
export const createProfileStore = (initial: ProfileInitial) => new Palistor({ config: profileConfig(initial) });

export type ProfileForm = ConfigProxy<ReturnType<typeof profileConfig>>;
