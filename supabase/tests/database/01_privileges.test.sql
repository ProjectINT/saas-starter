-- Structural security invariants. When a new client-callable function is
-- added on purpose, extend the whitelist below in the same change.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(13);

SELECT is_empty(
  $$
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
  $$,
  'RLS is enabled on every table in public'
);

SELECT is_empty(
  $$
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('v', 'm')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(c.reloptions, '{}')) AS o
        WHERE o IN ('security_invoker=true', 'security_invoker=on', 'security_invoker=1')
      )
  $$,
  'every view in public is security_invoker'
);

SELECT is_empty(
  $$
    SELECT c.relname
    FROM pg_class c
    WHERE c.relnamespace IN ('public'::regnamespace, 'private'::regnamespace)
      AND c.relkind IN ('r', 'p', 'v', 'm')
      AND has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
  $$,
  'anon has no privileges on tables and views'
);

SELECT is_empty(
  $$
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    WHERE p.pronamespace IN ('public'::regnamespace, 'private'::regnamespace)
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  $$,
  'anon cannot execute any function'
);

SELECT results_eq(
  $$
    SELECT (n.nspname || '.' || p.proname) COLLATE "default"
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private')
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ORDER BY 1
  $$,
  $$
    VALUES
      ('private.accept_invitation'),
      ('private.can_view_profile'),
      ('private.change_member_role'),
      ('private.create_account'),
      ('private.create_invitation'),
      ('private.decline_invitation'),
      ('private.delete_account'),
      ('private.get_invitation'),
      ('private.has_permission'),
      ('private.is_account_member'),
      ('private.is_platform_admin'),
      ('private.leave_account'),
      ('private.list_my_invitations'),
      ('private.remove_member'),
      ('private.revoke_invitation'),
      ('private.transfer_ownership'),
      ('public.accept_invitation'),
      ('public.change_member_role'),
      ('public.create_account'),
      ('public.create_invitation'),
      ('public.decline_invitation'),
      ('public.delete_account'),
      ('public.get_invitation'),
      ('public.leave_account'),
      ('public.list_my_invitations'),
      ('public.remove_member'),
      ('public.revoke_invitation'),
      ('public.transfer_ownership')
  $$,
  'authenticated can execute only whitelisted functions'
);

SELECT is_empty(
  $$
    SELECT p.proname
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef
  $$,
  'no SECURITY DEFINER functions in the exposed public schema'
);

SELECT is_empty(
  $$
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    WHERE p.pronamespace IN ('public'::regnamespace, 'private'::regnamespace)
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, '{}')) AS c
        WHERE c LIKE 'search_path=%'
      )
  $$,
  'every SECURITY DEFINER function pins search_path'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'private.platform_admins', 'SELECT, INSERT, UPDATE, DELETE'),
  'authenticated cannot touch platform_admins'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.account_members', 'INSERT, UPDATE, DELETE, TRUNCATE'),
  'authenticated cannot write account_members directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.accounts', 'INSERT, DELETE, TRUNCATE')
  AND NOT has_column_privilege('authenticated', 'public.accounts', 'owner_id', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.accounts', 'deactivated_at', 'UPDATE'),
  'authenticated cannot create/delete accounts or change owner_id/deactivated_at'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT, DELETE, TRUNCATE')
  AND NOT has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'),
  'authenticated cannot create/delete profiles or change id/email'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.account_invitations', 'INSERT, UPDATE, DELETE, TRUNCATE')
  AND NOT has_column_privilege('authenticated', 'public.account_invitations', 'token_hash', 'SELECT'),
  'authenticated cannot write invitations or read token hashes'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.role_permissions', 'INSERT, UPDATE, DELETE, TRUNCATE'),
  'authenticated cannot change the permission matrix'
);

SELECT * FROM finish();
ROLLBACK;
