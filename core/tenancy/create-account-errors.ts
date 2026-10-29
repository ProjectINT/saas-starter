import { SLUG_HINT } from "@/core/validation/slug";

export interface CreateAccountState {
  /** Field errors by input name, for HeroUI Form `validationErrors`. */
  errors: Record<string, string>;
  formError: string | null;
  /** Submitted values the errors refer to. */
  values: Record<string, string>;
}

export const initialCreateAccountState: CreateAccountState = { errors: {}, formError: null, values: {} };

// Constraint names from supabase/schemas/21_accounts.sql.
const CONSTRAINT_ERRORS: Record<string, { field: "name" | "slug"; message: string }> = {
  accounts_slug_key: { field: "slug", message: "This URL is already taken." },
  accounts_slug_not_reserved: { field: "slug", message: "This URL is reserved. Choose another one." },
  accounts_slug_format: { field: "slug", message: SLUG_HINT },
  accounts_name_check: { field: "name", message: "Enter a name of up to 100 characters." },
};

/**
 * Maps a create_account error (PostgREST: unique_violation 23505 or
 * check_violation 23514, constraint name in the message) to form state.
 */
export function createAccountErrorState(
  error: { code?: string; message: string },
  values: Record<string, string>
): CreateAccountState {
  if (error.code === "23505" || error.code === "23514") {
    const constraint = Object.keys(CONSTRAINT_ERRORS).find((name) => error.message.includes(`"${name}"`));

    if (constraint) {
      const { field, message } = CONSTRAINT_ERRORS[constraint];

      return { errors: { [field]: message }, formError: null, values };
    }
  }

  return { errors: {}, formError: "Could not create the account. Try again.", values };
}
