import type { useRouter } from "next/navigation";
import type { ConfigProxy, TranslateFn } from "palistor";

import { toast } from "@heroui/react";
import { Palistor } from "palistor";

import type { Translate } from "@/core/i18n/translate";
import { accountSettingsPath, routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";
import { createAccountErrorFields } from "@/core/tenancy/create-account-store";
import { rpcErrorMessage } from "@/core/tenancy/rpc-errors";
import { validateAccountName } from "@/core/validation/account-name";
import { validateSlug } from "@/core/validation/slug";

// Account settings: name and slug (an UPDATE of accounts under RLS, which
// requires account.update) and deletion (delete_account, account.delete).

/** What AccountSettings puts into store.context. */
export interface AccountSettingsContext {
  accountId: string;
  slug: string;
  name: string;
  router: ReturnType<typeof useRouter>;
  t: Translate;
}

export interface AccountSettingsInitial {
  name: string;
  slug: string;
}

interface GeneralValues {
  name: string;
  slug: string;
  nameError: string;
  slugError: string;
  formError: string;
}

interface DeletionValues {
  /** The slug typed again, as a deliberate confirmation. */
  confirmation: string;
  /** The confirmation dialog is open. */
  isOpen: boolean;
}

interface AccountSettingsStoreApi {
  readonly context: AccountSettingsContext;
  setValues(patch: { general?: Partial<GeneralValues>; deletion?: Partial<DeletionValues> }): void;
}

async function saveGeneral(values: GeneralValues, store: AccountSettingsStoreApi) {
  const { accountId, slug, router, t } = store.context;
  const { data, error } = await createClient()
    .from("accounts")
    .update({ name: values.name.trim(), slug: values.slug })
    .eq("id", accountId)
    .select("slug")
    .maybeSingle();

  if (error) {
    store.setValues({ general: createAccountErrorFields(error, t, t("Settings.saveFailed")) });

    return;
  }

  // RLS hides the row from an update without account.update: no error, no row.
  if (!data) {
    store.setValues({ general: { formError: t("RpcErrors.not_allowed") } });

    return;
  }

  store.setValues({ general: { formError: "" } });
  toast.success(t("Settings.account.saved"));

  if (data.slug !== slug) {
    router.replace(accountSettingsPath(data.slug, "account"));
  }

  // The frame (switcher, title) is rendered on the server.
  router.refresh();
}

async function deleteAccount(_values: DeletionValues, store: AccountSettingsStoreApi) {
  const { accountId, name, router, t } = store.context;
  const { error } = await createClient().rpc("delete_account", { p_account_id: accountId });

  if (error) {
    toast.danger(rpcErrorMessage(error, t));

    return;
  }

  toast.success(t("Settings.account.deleted", { account: name }));
  router.push(routes.accounts);
  router.refresh();
}

const accountSettingsConfig = (initial: AccountSettingsInitial) => ({
  general: {
    name: {
      value: initial.name,
      isRequired: true,
      validate: (value: string, values: GeneralValues, t: TranslateFn) => values.nameError || validateAccountName(value, t) || undefined,
      setter: () => ({ nameError: "", formError: "" }),
    },
    slug: {
      value: initial.slug,
      isRequired: true,
      formatter: (value: string | boolean) => String(value).toLowerCase(),
      validate: (value: string, values: GeneralValues, t: TranslateFn) => values.slugError || validateSlug(value, t) || undefined,
      setter: () => ({ slugError: "", formError: "" }),
    },
    nameError: { value: "" },
    slugError: { value: "" },
    formError: { value: "" },
    onSubmit: saveGeneral,
  },

  deletion: {
    confirmation: {
      value: "",
      isRequired: true,
      validate: (value: string, _values: DeletionValues, t: TranslateFn) => (value === initial.slug ? undefined : t("Settings.account.deleteConfirmMismatch")),
    },
    isOpen: { value: false },
    onSubmit: deleteAccount,
  },
});

/** One store per account settings page, prefilled from the account context. */
export const createAccountSettingsStore = (initial: AccountSettingsInitial) => new Palistor({ config: accountSettingsConfig(initial) });

export type AccountSettingsForm = ConfigProxy<ReturnType<typeof accountSettingsConfig>>;
