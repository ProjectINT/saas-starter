import { Auth } from "./auth.ts";
import { Common, Errors, Navigation, Roles, RpcErrors, Site, Validation } from "./common.ts";
import { Legal, Metadata } from "./pages.ts";
import { Accounts, Invitations, Members } from "./tenancy.ts";

/** Namespaces of the template core. Products add theirs in ../app, not here. */
export const coreDictionary = {
  Common,
  Site,
  Roles,
  Navigation,
  Validation,
  RpcErrors,
  Errors,
  Auth,
  Accounts,
  Members,
  Invitations,
  Metadata,
  Legal,
};
