import type { useRouter } from "next/navigation";
import type { TranslateFn } from "palistor";

import { Palistor } from "palistor";

import type { Translate } from "@/core/i18n/translate";
import { accountPath } from "@/core/config/routes";
import { captureException } from "@/core/errors";
import { createClient } from "@/core/supabase/client";
import { ACCOUNT_NAME_MAX_LENGTH, validateAccountName } from "@/core/validation/account-name";
import { slugHint, slugify, validateSlug } from "@/core/validation/slug";

// The onboarding form: account name + URL slug. create_account makes the
// signed-in user the owner and runs the app hook private.app_on_account_created.

/** What CreateAccountForm puts into store.context. */
export interface CreateAccountContext {
  router: ReturnType<typeof useRouter>;
  /** Root translator from useTranslations(), for the RPC errors. */
  t: Translate;
}

interface AccountValues {
  name: string;
  slug: string;
  /** The slug was typed by hand, so it no longer follows the name. */
  slugEdited: boolean;
  /** Errors of the last create_account call, shown under their field or above the form. */
  nameError: string;
  slugError: string;
  formError: string;
  /** Set once the account exists, while the browser opens it. */
  redirecting: boolean;
}

/** The part of the store createAccount() uses (palistor hands the store to onSubmit untyped). */
interface CreateAccountStoreApi {
  /** Set by CreateAccountForm on mount. */
  readonly context: CreateAccountContext;
  setValues(patch: { account: Partial<AccountValues> }): void;
}

// Constraint names from supabase/schemas/21_accounts.sql.
const CONSTRAINT_ERRORS: Record<string, { field: "nameError" | "slugError"; message: (t: Translate) => string }> = {
  accounts_slug_key: { field: "slugError", message: (t) => t("Accounts.create.slugTaken") },
  accounts_slug_not_reserved: { field: "slugError", message: (t) => t("Accounts.create.slugReserved") },
  accounts_slug_format: { field: "slugError", message: slugHint },
  accounts_name_check: { field: "nameError", message: (t) => t("Accounts.create.nameInvalid", { max: ACCOUNT_NAME_MAX_LENGTH }) },
};

/**
 * Maps a create_account error, or an error of an update of the account
 * (PostgREST: unique_violation 23505 or check_violation 23514, constraint
 * name in the message), to the field it concerns, or to the whole form with
 * `fallback` (reported: it is not an expected outcome).
 */
export function createAccountErrorFields(error: { code?: string; message: string }, t: Translate, fallback = t("Accounts.create.failed")) {
  const errors = { nameError: "", slugError: "", formError: "" };

  if (error.code === "23505" || error.code === "23514") {
    const constraint = Object.keys(CONSTRAINT_ERRORS).find((name) => error.message.includes(`"${name}"`));

    if (constraint) {
      const { field, message } = CONSTRAINT_ERRORS[constraint];

      return { ...errors, [field]: message(t) };
    }
  }

  captureException(error, { source: "create_account" });

  return { ...errors, formError: fallback };
}

async function createAccount(values: AccountValues, store: CreateAccountStoreApi) {
  const { router, t } = store.context;
  const { data, error } = await createClient().rpc("create_account", { p_name: values.name, p_slug: values.slug });

  if (error) {
    store.setValues({ account: createAccountErrorFields(error, t) });

    return;
  }

  store.setValues({ account: { formError: "", redirecting: true } });
  router.push(accountPath(data.slug));
}

const createAccountConfig = () => ({
  account: {
    name: {
      value: "",
      isRequired: true,
      validate: (value: string, values: AccountValues, t: TranslateFn) => values.nameError || validateAccountName(value, t) || undefined,
      // The slug follows the name until it is edited by hand.
      setter: (value: string, values: AccountValues) => (
        values.slugEdited ? { nameError: "" } : { nameError: "", slug: slugify(value), slugError: "" }
      ),
    },
    slug: {
      value: "",
      isRequired: true,
      formatter: (value: string | boolean) => String(value).toLowerCase(),
      validate: (value: string, values: AccountValues, t: TranslateFn) => values.slugError || validateSlug(value, t) || undefined,
      setter: (value: string) => ({ slugError: "", slugEdited: value !== "" }),
    },
    slugEdited: { value: false },
    nameError: { value: "" },
    slugError: { value: "" },
    formError: { value: "" },
    redirecting: { value: false },
    onSubmit: createAccount,
  },
});

export const createAccountStore = () => new Palistor({ config: createAccountConfig() });
