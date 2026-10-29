-- Example module (modules/example): projects inside an account. It shows the
-- pattern for tenant data; delete it with the module (docs/ADDING_A_MODULE.md).
--
-- Plain CRUD under RLS: reads need projects.view, writes projects.manage
-- (granted to roles in the migration *_example_projects_permissions.sql).
-- Writes with rules beyond one row's permission belong in an RPC instead.

CREATE TABLE IF NOT EXISTS public.projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  created_by  uuid DEFAULT auth.uid() REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.projects IS 'Example module: projects of an account. Read with projects.view, written with projects.manage.';
COMMENT ON COLUMN public.projects.created_by IS 'Set by the database (auth.uid()); clients cannot write it.';

CREATE INDEX IF NOT EXISTS projects_account_id_idx ON public.projects (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_created_by_idx ON public.projects (created_by);

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- id, created_by and timestamps are the database's.
GRANT SELECT, DELETE ON public.projects TO authenticated;
GRANT INSERT (account_id, name, description) ON public.projects TO authenticated;
GRANT UPDATE (name, description) ON public.projects TO authenticated;

CREATE POLICY projects_select ON public.projects
FOR SELECT
TO authenticated
USING (private.has_permission(account_id, 'projects.view'));

CREATE POLICY projects_insert ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (private.has_permission(account_id, 'projects.manage'));

CREATE POLICY projects_update ON public.projects
FOR UPDATE
TO authenticated
USING (private.has_permission(account_id, 'projects.manage'))
WITH CHECK (private.has_permission(account_id, 'projects.manage'));

CREATE POLICY projects_delete ON public.projects
FOR DELETE
TO authenticated
USING (private.has_permission(account_id, 'projects.manage'));
