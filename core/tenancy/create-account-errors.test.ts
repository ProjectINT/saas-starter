import { describe, expect, it } from "vitest";

import { createAccountErrorState } from "./create-account-errors";

// Shapes as returned by PostgREST for public.create_account.
const values = { name: "Acme", slug: "acme" };

describe("createAccountErrorState", () => {
  it("reports a taken slug on the slug field", () => {
    expect(
      createAccountErrorState({
        code: "23505",
        message: "duplicate key value violates unique constraint \"accounts_slug_key\"",
      }, values)
    ).toEqual({ errors: { slug: "This URL is already taken." }, formError: null, values });
  });

  it("reports reserved and malformed slugs", () => {
    expect(
      createAccountErrorState({
        code: "23514",
        message: "new row for relation \"accounts\" violates check constraint \"accounts_slug_not_reserved\"",
      }, values).errors.slug
    ).toMatch(/reserved/);
    expect(
      createAccountErrorState({
        code: "23514",
        message: "new row for relation \"accounts\" violates check constraint \"accounts_slug_format\"",
      }, values).errors.slug
    ).toMatch(/Lowercase/);
  });

  it("reports an invalid name on the name field", () => {
    expect(
      createAccountErrorState({
        code: "23514",
        message: "new row for relation \"accounts\" violates check constraint \"accounts_name_check\"",
      }, values).errors
    ).toHaveProperty("name");
  });

  it("falls back to a form error", () => {
    expect(createAccountErrorState({ code: "42501", message: "Not authenticated" }, values)).toEqual({
      errors: {},
      formError: "Could not create the account. Try again.",
      values,
    });
  });
});
