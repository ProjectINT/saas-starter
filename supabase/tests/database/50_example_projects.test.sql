-- Example module: projects are visible to members (projects.view) and
-- written by owners and admins (projects.manage), only in their own accounts.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('50000000-0000-4000-8000-00000000000a', 'p-owner@test.local', now(), '{}'),
  ('50000000-0000-4000-8000-00000000000b', 'p-member@test.local', now(), '{}'),
  ('50000000-0000-4000-8000-00000000000c', 'p-outsider@test.local', now(), '{}');

INSERT INTO public.accounts (id, slug, name, owner_id) VALUES
  ('51000000-0000-4000-8000-000000000001', 'proj-co', 'Proj Co', '50000000-0000-4000-8000-00000000000a'),
  ('51000000-0000-4000-8000-000000000002', 'proj-other', 'Other', '50000000-0000-4000-8000-00000000000c');

INSERT INTO public.account_members (account_id, user_id, role) VALUES
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-00000000000a', 'owner'),
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-00000000000b', 'member'),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-00000000000c', 'owner');

CREATE FUNCTION pg_temp.login_as(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

-- Owner writes ------------------------------------------------------------------
SELECT pg_temp.login_as('50000000-0000-4000-8000-00000000000a');

SELECT lives_ok(
  $$ INSERT INTO public.projects (account_id, name) VALUES ('51000000-0000-4000-8000-000000000001', 'Launch') $$,
  'an owner creates a project'
);

SELECT is(
  (SELECT created_by FROM public.projects WHERE name = 'Launch'),
  '50000000-0000-4000-8000-00000000000a'::uuid,
  'created_by is set by the database'
);

SELECT throws_ok(
  $$ INSERT INTO public.projects (account_id, name, created_by) VALUES ('51000000-0000-4000-8000-000000000001', 'Forged', '50000000-0000-4000-8000-00000000000b') $$,
  '42501', NULL, 'clients cannot set created_by'
);

SELECT throws_ok(
  $$ INSERT INTO public.projects (account_id, name) VALUES ('51000000-0000-4000-8000-000000000002', 'Elsewhere') $$,
  '42501', NULL, 'nobody writes into an account of others'
);

-- Member reads only ---------------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('50000000-0000-4000-8000-00000000000b');

SELECT results_eq($$ SELECT name FROM public.projects $$, $$ VALUES ('Launch'::text) $$, 'a member sees the projects of the account');

SELECT throws_ok(
  $$ INSERT INTO public.projects (account_id, name) VALUES ('51000000-0000-4000-8000-000000000001', 'Mine') $$,
  '42501', NULL, 'a member cannot create projects'
);

UPDATE public.projects SET name = 'Renamed' WHERE name = 'Launch';
DELETE FROM public.projects WHERE name = 'Launch';

RESET ROLE;
SELECT results_eq($$ SELECT name FROM public.projects $$, $$ VALUES ('Launch'::text) $$, 'a member cannot rename or delete projects');

-- Outsider -------------------------------------------------------------------------
SELECT pg_temp.login_as('50000000-0000-4000-8000-00000000000c');

SELECT is_empty($$ SELECT id FROM public.projects $$, 'others see none of the projects');

RESET ROLE;
SELECT pg_temp.login_as('50000000-0000-4000-8000-00000000000a');
DELETE FROM public.projects WHERE name = 'Launch';
RESET ROLE;

SELECT is_empty($$ SELECT id FROM public.projects WHERE account_id = '51000000-0000-4000-8000-000000000001' $$, 'an owner deletes a project');

SELECT * FROM finish();
ROLLBACK;
