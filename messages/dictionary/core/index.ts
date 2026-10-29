import { Admin } from "./admin.ts";
import { Auth } from "./auth.ts";
import { Common, Errors, Navigation, Roles, RpcErrors, Site, Validation } from "./common.ts";
import { Emails } from "./emails.ts";
import { Legal, Metadata } from "./pages.ts";
import { Settings } from "./settings.ts";
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
  Settings,
  Admin,
  Emails,
  Metadata,
  Legal,
};
