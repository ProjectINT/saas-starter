-- Accounts are tenants. Every tenant-owned row in the app references
-- accounts.id, and its RLS goes through private.has_permission().

CREATE TABLE IF NOT EXISTS public.accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL,
  name           text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  owner_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  logo_path      text CHECK (char_length(logo_path) <= 1024),
  deactivated_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT accounts_slug_key UNIQUE (slug),
  -- 3-48 chars: lowercase letters, digits, inner hyphens.
  CONSTRAINT accounts_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  -- Slugs are the first URL segment (/[account]/...), so they must not
  -- shadow top-level routes.
  CONSTRAINT accounts_slug_not_reserved CHECK (slug <> ALL (ARRAY[
    'about', 'account', 'accounts', 'admin', 'api', 'app', 'assets', 'auth', 'blog',
    'callback', 'confirm', 'contact', 'dashboard', 'docs', 'error', 'favicon',
    'forgot-password', 'help', 'invite', 'invites', 'invitations', 'legal', 'login',
    'logout', 'manage', 'new', 'not-found', 'null', 'onboarding', 'pricing', 'privacy',
    'privacy-policy', 'profile', 'public', 'register', 'reset-password', 'settings',
    'sign-in', 'sign-out', 'sign-up', 'signin', 'signout', 'signup', 'static', 'status',
    'support', 'terms', 'terms-of-use', 'undefined', 'www'
  ]))
);

COMMENT ON TABLE public.accounts IS 'Tenants. Created only through public.create_account().';
COMMENT ON COLUMN public.accounts.slug IS 'URL identifier: /[slug]/... Unique, lowercase, not a reserved route name.';
COMMENT ON COLUMN public.accounts.owner_id IS 'The single owner. Mirrors the member with role owner; RESTRICT keeps an owner from being deleted while they own accounts.';
COMMENT ON COLUMN public.accounts.logo_path IS 'Storage object path, not a URL.';
COMMENT ON COLUMN public.accounts.deactivated_at IS 'Set by platform admins. A deactivated account grants no access to anyone.';

CREATE INDEX IF NOT EXISTS accounts_owner_id_idx ON public.accounts (owner_id);

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- No INSERT/DELETE for clients: accounts are created by create_account().
-- owner_id and deactivated_at change only through server-side functions.
GRANT SELECT ON public.accounts TO authenticated;
GRANT UPDATE (name, slug, logo_path) ON public.accounts TO authenticated;

CREATE POLICY accounts_select ON public.accounts
FOR SELECT
TO authenticated
USING (private.is_account_member(id));

CREATE POLICY accounts_update ON public.accounts
FOR UPDATE
TO authenticated
USING (private.has_permission(id, 'account.update'))
WITH CHECK (private.has_permission(id, 'account.update'));
