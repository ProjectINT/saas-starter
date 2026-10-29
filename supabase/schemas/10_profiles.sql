-- One profile per auth user. Created by a trigger on auth.users.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email       text,
  first_name  text CHECK (char_length(first_name) <= 100),
  last_name   text CHECK (char_length(last_name) <= 100),
  avatar_path text CHECK (char_length(avatar_path) <= 1024),
  locale      text CHECK (locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  timezone    text CHECK (char_length(timezone) <= 64),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Public profile of an auth user. Visible to the user and to members of shared accounts with members.view.';
COMMENT ON COLUMN public.profiles.email IS 'Copy of auth.users.email, kept in sync by a trigger. Read-only for clients.';
COMMENT ON COLUMN public.profiles.avatar_path IS 'Storage object path, not a URL.';
COMMENT ON COLUMN public.profiles.locale IS 'Preferred UI/email language (BCP 47), e.g. en, ru, pt-BR.';
COMMENT ON COLUMN public.profiles.timezone IS 'IANA time zone, e.g. Europe/Berlin.';

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clients may edit only these columns; id, email and timestamps are server-owned.
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, avatar_path, locale, timezone) ON public.profiles TO authenticated;

CREATE POLICY profiles_select ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()) OR private.can_view_profile(id));

CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Provisioning.
--
-- raw_user_meta_data is fully controlled by the client (signUp options.data),
-- so it may only ever fill cosmetic profile fields. Never read roles, account
-- ids or any other authorization data from it. Accounts and memberships are
-- created by explicit RPCs (create_account, invitations).
--
-- Values are trimmed and truncated so a bad payload cannot fail the sign-up.

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

COMMENT ON FUNCTION private.handle_new_user() IS 'AFTER INSERT on auth.users: creates the profile. Reads only cosmetic fields from user metadata.';

CREATE OR REPLACE FUNCTION private.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION private.handle_user_email_change() IS 'AFTER UPDATE OF email on auth.users: keeps profiles.email in sync.';

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_email_changed
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION private.handle_user_email_change();
