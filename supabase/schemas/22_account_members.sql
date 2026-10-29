-- Membership: who belongs to which account and with which role.
--
-- Clients get read access only. Every write goes through SECURITY DEFINER
-- functions that check permissions (create_account now; invitations, role
-- changes and removal later). Removing a member deletes the row: a membership
-- is an access grant, and a soft-deleted grant is one missed filter away from
-- still granting access.

CREATE TABLE IF NOT EXISTS public.account_members (
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role       public.account_role NOT NULL DEFAULT 'member',
  invited_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (account_id, user_id)
);

COMMENT ON TABLE public.account_members IS 'User <-> account membership with a role. Read-only for clients; written by server-side functions.';
COMMENT ON COLUMN public.account_members.invited_by IS 'Who added this member (NULL for the creator of the account).';

CREATE INDEX IF NOT EXISTS account_members_user_id_idx ON public.account_members (user_id);
CREATE INDEX IF NOT EXISTS account_members_invited_by_idx ON public.account_members (invited_by);
-- At most one owner per account.
CREATE UNIQUE INDEX IF NOT EXISTS account_members_one_owner_idx ON public.account_members (account_id) WHERE role = 'owner';

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

-- The owner role belongs to accounts.owner_id and nobody else.
-- An ownership transfer changes accounts.owner_id first, then the roles.
CREATE OR REPLACE FUNCTION private.check_account_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

COMMENT ON FUNCTION private.check_account_owner() IS 'BEFORE INSERT/UPDATE on account_members: role owner only for accounts.owner_id.';

CREATE TRIGGER check_account_owner
BEFORE INSERT OR UPDATE OF account_id, user_id, role ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION private.check_account_owner();

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.account_members TO authenticated;

-- Own memberships are always visible (account switcher); the rest of the
-- roster requires members.view.
CREATE POLICY account_members_select ON public.account_members
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.has_permission(account_id, 'members.view')
);
