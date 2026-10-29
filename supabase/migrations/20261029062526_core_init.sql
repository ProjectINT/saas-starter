SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

CREATE SCHEMA "private";

CREATE TABLE "private"."platform_admins" (
  "user_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "platform_admins_pkey" PRIMARY KEY (user_id)
);

CREATE TABLE "public"."account_members" (
  "account_id" uuid NOT NULL,
  "user_id"    uuid NOT NULL,
  CONSTRAINT "account_members_pkey" PRIMARY KEY (account_id, user_id)
);

ALTER TABLE "public"."account_members"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."account_members" FROM "anon";

CREATE TABLE "public"."accounts" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"           text                     NOT NULL,
  "name"           text                     NOT NULL,
  "owner_id"       uuid                     NOT NULL,
  "logo_path"      text,
  "deactivated_at" timestamp with time zone,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "accounts_logo_path_check" CHECK ((char_length(logo_path) <= 1024)),
  CONSTRAINT "accounts_name_check" CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 100))),
  CONSTRAINT "accounts_pkey" PRIMARY KEY (id),
  CONSTRAINT "accounts_slug_format" CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'::text)),
  CONSTRAINT "accounts_slug_key" UNIQUE (slug),
  CONSTRAINT "accounts_slug_not_reserved"
    CHECK
    ((slug <> ALL (ARRAY['about'::text, 'account'::text, 'accounts'::text, 'admin'::text, 'api'::text, 'app'::text, 'assets'::text, 'auth'::text, 'blog'::text, 'callback'::text,
    'confirm'::text,
    'contact'::text,
    'dashboard'::text,
    'docs'::text,
    'error'::text,
    'favicon'::text,
    'forgot-password'::text,
    'help'::text,
    'invite'::text,
    'invites'::text,
    'invitations'::text,
    'legal'::text,
    'login'::text,
    'logout'::text,
    'manage'::text,
    'new'::text,
    'not-found'::text,
    'null'::text,
    'onboarding'::text,
    'pricing'::text,
    'privacy'::text,
    'privacy-policy'::text,
    'profile'::text,
    'public'::text,
    'register'::text,
    'reset-password'::text,
    'settings'::text,
    'sign-in'::text,
    'sign-out'::text,
    'sign-up'::text,
    'signin'::text, 'signout'::text, 'signup'::text, 'static'::text, 'status'::text, 'support'::text, 'terms'::text, 'terms-of-use'::text, 'undefined'::text, 'www'::text])))
);

ALTER TABLE "public"."accounts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."accounts" FROM "anon";

CREATE TABLE "public"."profiles" (
  "id"          uuid                     NOT NULL,
  "email"       text,
  "first_name"  text,
  "last_name"   text,
  "avatar_path" text,
  "locale"      text,
  "timezone"    text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_avatar_path_check" CHECK ((char_length(avatar_path) <= 1024)),
  CONSTRAINT "profiles_first_name_check" CHECK ((char_length(first_name) <= 100)),
  CONSTRAINT "profiles_last_name_check" CHECK ((char_length(last_name) <= 100)),
  CONSTRAINT "profiles_locale_check" CHECK ((locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'::text)),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_timezone_check" CHECK ((char_length(timezone) <= 64))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."profiles" FROM "anon";

CREATE TABLE "public"."role_permissions" ();

ALTER TABLE "public"."role_permissions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."role_permissions" FROM "anon";

CREATE TYPE "public"."account_role" AS ENUM (
  'owner',
  'admin',
  'member'
);

ALTER TABLE "public"."account_members"
  ADD COLUMN "role" public.account_role NOT NULL DEFAULT 'member'::public.account_role;

ALTER TABLE "public"."account_members"
  ADD COLUMN "invited_by" uuid;

ALTER TABLE "public"."account_members"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."account_members"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."role_permissions"
  ADD COLUMN "role" public.account_role NOT NULL;

ALTER TABLE "public"."role_permissions"
  ADD COLUMN "permission" text NOT NULL;

CREATE OR REPLACE FUNCTION private.app_on_account_created (
  p_account_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION private.can_view_profile (
  p_user_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.account_members mine
    JOIN public.accounts a ON a.id = mine.account_id
    JOIN public.role_permissions rp ON rp.role = mine.role AND rp.permission = 'members.view'
    JOIN public.account_members theirs ON theirs.account_id = mine.account_id
    WHERE mine.user_id = (SELECT auth.uid())
      AND theirs.user_id = p_user_id
      AND a.deactivated_at IS NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.check_account_owner()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF NEW.role = 'owner' AND NOT EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = NEW.account_id
      AND a.owner_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Only the account owner (accounts.owner_id) can have the owner role'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.create_account (
  p_name text,
  p_slug text
)
  RETURNS public.accounts
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_account public.accounts;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.accounts (name, slug, owner_id)
  VALUES (btrim(p_name), lower(btrim(p_slug)), v_user_id)
  RETURNING * INTO v_account;

  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (v_account.id, v_user_id, 'owner');

  PERFORM private.app_on_account_created(v_account.id);

  RETURN v_account;
END;
$function$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    left(nullif(btrim(NEW.raw_user_meta_data ->> 'first_name'), ''), 100),
    left(nullif(btrim(NEW.raw_user_meta_data ->> 'last_name'), ''), 100)
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.handle_user_email_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.has_permission (
  p_account_id uuid,
  p_permission text
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.account_members m
    JOIN public.accounts a ON a.id = m.account_id
    JOIN public.role_permissions rp ON rp.role = m.role
    WHERE m.account_id = p_account_id
      AND m.user_id = (SELECT auth.uid())
      AND a.deactivated_at IS NULL
      AND rp.permission = p_permission
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.is_account_member (
  p_account_id uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.account_members m
    JOIN public.accounts a ON a.id = m.account_id
    WHERE m.account_id = p_account_id
      AND m.user_id = (SELECT auth.uid())
      AND a.deactivated_at IS NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.is_platform_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM private.platform_admins pa
    WHERE pa.user_id = (SELECT auth.uid())
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_account (
  p_name text,
  p_slug text
)
  RETURNS public.accounts
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN private.create_account(p_name, p_slug);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."create_account"(text, text) FROM PUBLIC, "anon";

ALTER TABLE "public"."account_members"
  ADD CONSTRAINT "account_members_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "private"."platform_admins"
  ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."account_members"
  ADD CONSTRAINT "account_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."account_members"
  ADD CONSTRAINT "account_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE "public"."role_permissions"
  ADD CONSTRAINT "role_permissions_permission_check" CHECK ((permission ~ '^[a-z][a-z_]*(\.[a-z][a-z_]*)+$'::text));

ALTER TABLE "public"."role_permissions"
  ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY (ROLE, permission);

CREATE INDEX account_members_invited_by_idx ON public.account_members USING btree (invited_by);

CREATE UNIQUE INDEX account_members_one_owner_idx ON public.account_members USING btree (account_id)
  WHERE (ROLE = 'owner'::public.account_role);

CREATE INDEX account_members_user_id_idx ON public.account_members USING btree (user_id);

CREATE INDEX accounts_owner_id_idx ON public.accounts USING btree (owner_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_user();

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (((old.email)::text IS DISTINCT FROM (new.email)::text))
  EXECUTE FUNCTION private.handle_user_email_change();

CREATE TRIGGER check_account_owner
  BEFORE INSERT OR UPDATE OF account_id, user_id, ROLE ON public.account_members
  FOR EACH ROW
  EXECUTE FUNCTION private.check_account_owner();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.account_members
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE POLICY "account_members_select" ON "public"."account_members"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR private.has_permission(account_id, 'members.view'::text)));

CREATE POLICY "accounts_select" ON "public"."accounts"
  FOR SELECT
  TO "authenticated"
  USING (private.is_account_member(id));

CREATE POLICY "accounts_update" ON "public"."accounts"
  FOR UPDATE
  TO "authenticated"
  USING (private.has_permission(id, 'account.update'::text))
  WITH CHECK (private.has_permission(id, 'account.update'::text));

CREATE POLICY "profiles_select" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((id = ( SELECT auth.uid() AS uid)) OR private.can_view_profile(id)));

CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "role_permissions_select" ON "public"."role_permissions"
  FOR SELECT
  TO "authenticated"
  USING (true);

COMMENT ON COLUMN "public"."account_members"."invited_by" IS 'Who added this member (NULL for the creator of the account).';

COMMENT ON COLUMN "public"."accounts"."deactivated_at" IS 'Set by platform admins. A deactivated account grants no access to anyone.';

COMMENT ON COLUMN "public"."accounts"."logo_path" IS 'Storage object path, not a URL.';

COMMENT ON COLUMN "public"."accounts"."owner_id" IS 'The single owner. Mirrors the member with role owner; RESTRICT keeps an owner from being deleted while they own accounts.';

COMMENT ON COLUMN "public"."accounts"."slug" IS 'URL identifier: /[slug]/... Unique, lowercase, not a reserved route name.';

COMMENT ON COLUMN "public"."profiles"."avatar_path" IS 'Storage object path, not a URL.';

COMMENT ON COLUMN "public"."profiles"."email" IS 'Copy of auth.users.email, kept in sync by a trigger. Read-only for clients.';

COMMENT ON COLUMN "public"."profiles"."locale" IS 'Preferred UI/email language (BCP 47), e.g. en, ru, pt-BR.';

COMMENT ON COLUMN "public"."profiles"."timezone" IS 'IANA time zone, e.g. Europe/Berlin.';

COMMENT ON FUNCTION "private"."can_view_profile"(uuid) IS 'True if the user is a member of an active account where the current user has members.view.';

COMMENT ON FUNCTION "private"."check_account_owner"() IS 'BEFORE INSERT/UPDATE on account_members: role owner only for accounts.owner_id.';

COMMENT ON FUNCTION "private"."create_account"(text, text) IS 'Creates an account and the owner membership for auth.uid(), then calls the app hook.';

COMMENT ON FUNCTION "private"."handle_new_user"() IS 'AFTER INSERT on auth.users: creates the profile. Reads only cosmetic fields from user metadata.';

COMMENT ON FUNCTION "private"."handle_user_email_change"() IS 'AFTER UPDATE OF email on auth.users: keeps profiles.email in sync.';

COMMENT ON FUNCTION "private"."has_permission"(uuid, text) IS 'True if the current user''s role in the active account grants the permission (see public.role_permissions). The single source of truth for RLS and RPC checks.';

COMMENT ON FUNCTION "private"."is_account_member"(uuid) IS 'True if the current user is a member of the active account.';

COMMENT ON FUNCTION "private"."is_platform_admin"() IS 'True if the current user is a platform (super) admin.';

COMMENT ON FUNCTION "private"."set_updated_at"() IS 'BEFORE UPDATE trigger: keeps updated_at current.';

COMMENT ON FUNCTION "public"."create_account"(text, text) IS 'Creates an account owned by the current user. Errors: accounts_slug_key (taken), accounts_slug_format, accounts_slug_not_reserved, name check.';

COMMENT ON TABLE "private"."platform_admins" IS 'Users with platform-wide admin rights. Check with private.is_platform_admin().';

COMMENT ON TABLE "public"."account_members" IS 'User <-> account membership with a role. Read-only for clients; written by server-side functions.';

COMMENT ON TABLE "public"."accounts" IS 'Tenants. Created only through public.create_account().';

COMMENT ON TABLE "public"."profiles" IS 'Public profile of an auth user. Visible to the user and to members of shared accounts with members.view.';

COMMENT ON TABLE "public"."role_permissions" IS 'Permission matrix: role -> permission (e.g. members.invite). Readable by every signed-in user.';

COMMENT ON TYPE "public"."account_role" IS 'Member role in an account. Declaration order = privilege order (owner is the most privileged).';

REVOKE ALL ON FUNCTION "private"."app_on_account_created"(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."app_on_account_created"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."app_on_account_created"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."can_view_profile"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_view_profile"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."can_view_profile"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."can_view_profile"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."check_account_owner"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."check_account_owner"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."check_account_owner"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."create_account"(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."create_account"(text, text) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."create_account"(text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."create_account"(text, text) TO "postgres";

REVOKE ALL ON FUNCTION "private"."handle_new_user"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."handle_new_user"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."handle_user_email_change"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."handle_user_email_change"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."handle_user_email_change"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."has_permission"(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."has_permission"(uuid, text) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."has_permission"(uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."has_permission"(uuid, text) TO "postgres";

REVOKE ALL ON FUNCTION "private"."is_account_member"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_account_member"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."is_account_member"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."is_account_member"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."is_platform_admin"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_platform_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."is_platform_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."is_platform_admin"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."set_updated_at"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."set_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."set_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_account"(text, text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."create_account"(text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_account"(text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_account"(text, text) TO "service_role";

GRANT USAGE ON SCHEMA "private" TO "authenticated", "service_role";

REVOKE ALL ON TABLE "public"."account_members" FROM "authenticated";

GRANT SELECT ON TABLE "public"."account_members" TO "authenticated";

REVOKE ALL ON TABLE "public"."account_members" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."account_members" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."account_members" TO "service_role";

REVOKE ALL ON TABLE "public"."accounts" FROM "authenticated";

REVOKE ALL ("logo_path") ON TABLE "public"."accounts" FROM "authenticated";

GRANT UPDATE ("logo_path") ON TABLE "public"."accounts" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."accounts" FROM "authenticated";

GRANT UPDATE ("name") ON TABLE "public"."accounts" TO "authenticated";

REVOKE ALL ("slug") ON TABLE "public"."accounts" FROM "authenticated";

GRANT UPDATE ("slug") ON TABLE "public"."accounts" TO "authenticated";

GRANT SELECT ON TABLE "public"."accounts" TO "authenticated";

REVOKE ALL ON TABLE "public"."accounts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "service_role";

REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";

REVOKE ALL ("avatar_path") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("avatar_path") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("first_name") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("first_name") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("last_name") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("last_name") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("locale") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("locale") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("timezone") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("timezone") ON TABLE "public"."profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

REVOKE ALL ON TABLE "public"."role_permissions" FROM "authenticated";

GRANT SELECT ON TABLE "public"."role_permissions" TO "authenticated";

REVOKE ALL ON TABLE "public"."role_permissions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."role_permissions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."role_permissions" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE ALL ON FUNCTIONS FROM PUBLIC;
