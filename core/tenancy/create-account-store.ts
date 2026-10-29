import type { useRouter } from "next/navigation";

import { Palistor } from "palistor";

import { accountPath } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { validateAccountName } from "@/core/validation/account-name";
import { SLUG_HINT, slugify, validateSlug } from "@/core/validation/slug";

// The onboarding form: account name + URL slug. create_account makes the
// signed-in user the owner and runs the app hook private.app_on_account_created.

/** What CreateAccountForm puts into store.context. */
export interface CreateAccountContext {
  router: ReturnType<typeof useRouter>;
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
  readonly context: Record<string, unknown>;
  setValues(patch: { account: Partial<AccountValues> }): void;
}

// Constraint names from supabase/schemas/21_accounts.sql.
const CONSTRAINT_ERRORS: Record<string, { field: "nameError" | "slugError"; message: string }> = {
  accounts_slug_key: { field: "slugError", message: "This URL is already taken." },
  accounts_slug_not_reserved: { field: "slugError", message: "This URL is reserved. Choose another one." },
  accounts_slug_format: { field: "slugError", message: SLUG_HINT },
  accounts_name_check: { field: "nameError", message: "Enter a name of up to 100 characters." },
};

/**
 * Maps a create_account error (PostgREST: unique_violation 23505 or
 * check_violation 23514, constraint name in the message) to the field it
 * concerns, or to the whole form.
 */
export function createAccountErrorFields(error: { code?: string; message: string }) {
  const errors = { nameError: "", slugError: "", formError: "" };

  if (error.code === "23505" || error.code === "23514") {
    const constraint = Object.keys(CONSTRAINT_ERRORS).find((name) => error.message.includes(`"${name}"`));

    if (constraint) {
      const { field, message } = CONSTRAINT_ERRORS[constraint];

      return { ...errors, [field]: message };
    }
  }

  return { ...errors, formError: "Could not create the account. Try again." };
}

async function createAccount(values: AccountValues, store: CreateAccountStoreApi) {
  const { router } = store.context as Partial<CreateAccountContext>;
  const { data, error } = await createClient().rpc("create_account", { p_name: values.name, p_slug: values.slug });

  if (error) {
    store.setValues({ account: createAccountErrorFields(error) });

    return;
  }

  store.setValues({ account: { formError: "", redirecting: true } });
  router?.push(accountPath(data.slug));
}

const createAccountConfig = () => ({
  account: {
    name: {
      value: "",
      isRequired: true,
      validate: (value: string, values: AccountValues) => values.nameError || validateAccountName(value) || undefined,
      // The slug follows the name until it is edited by hand.
      setter: (value: string, values: AccountValues) => (
        values.slugEdited ? { nameError: "" } : { nameError: "", slug: slugify(value), slugError: "" }
      ),
    },
    slug: {
      value: "",
      isRequired: true,
      formatter: (value: string | boolean) => String(value).toLowerCase(),
      validate: (value: string, values: AccountValues) => values.slugError || validateSlug(value) || undefined,
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
