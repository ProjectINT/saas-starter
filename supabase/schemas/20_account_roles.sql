-- Roles and permissions inside an account (tenant).
--
-- Enum order is privilege order: earlier = more privileged, so
-- `role_a <= role_b` means "role_a is at least as privileged as role_b".
-- Rule for later RPCs: a member may assign only roles >= their own.
-- Projects add roles in their own schemas:
--   ALTER TYPE public.account_role ADD VALUE 'viewer' AFTER 'member';
-- and grant them permissions in a migration.

CREATE TYPE public.account_role AS ENUM ('owner', 'admin', 'member');

COMMENT ON TYPE public.account_role IS 'Member role in an account. Declaration order = privilege order (owner is the most privileged).';

-- Which role has which permission. The only place where role rules live:
-- RLS and RPCs ask private.has_permission(), the UI reads this table.
-- Rows are data, so they are inserted by migrations, not by this file.
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role       public.account_role NOT NULL,
  permission text NOT NULL CHECK (permission ~ '^[a-z][a-z_]*(\.[a-z][a-z_]*)+$'),
  PRIMARY KEY (role, permission)
);

COMMENT ON TABLE public.role_permissions IS 'Permission matrix: role -> permission (e.g. members.invite). Readable by every signed-in user.';

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.role_permissions TO authenticated;

CREATE POLICY role_permissions_select ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);
