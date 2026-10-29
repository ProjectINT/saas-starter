-- Platform admin RPCs: closed to everyone else (including account owners),
-- lists with search and paging, account deactivation and its effect.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(12);

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('90000000-0000-4000-8000-00000000000a', 'adm-admin@test.local', now(), '{"first_name": "Root"}'),
  ('90000000-0000-4000-8000-00000000000b', 'adm-owner@test.local', now(), '{"first_name": "Olga", "last_name": "Owner"}'),
  ('90000000-0000-4000-8000-00000000000c', 'adm-member@test.local', now(), '{}');

INSERT INTO private.platform_admins (user_id) VALUES ('90000000-0000-4000-8000-00000000000a');

INSERT INTO public.accounts (id, slug, name, owner_id) VALUES
  ('91000000-0000-4000-8000-000000000001', 'adm-alpha', 'Alpha 100%_Co', '90000000-0000-4000-8000-00000000000b'),
  ('91000000-0000-4000-8000-000000000002', 'adm-beta', 'Beta', '90000000-0000-4000-8000-00000000000b');

INSERT INTO public.account_members (account_id, user_id, role) VALUES
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000b', 'owner'),
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000c', 'member'),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-00000000000b', 'owner');

CREATE FUNCTION pg_temp.login_as(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

-- Not for owners ---------------------------------------------------------------
SELECT pg_temp.login_as('90000000-0000-4000-8000-00000000000b');

SELECT is(public.is_platform_admin(), false, 'an account owner is not a platform admin');
SELECT throws_ok($$ SELECT * FROM public.admin_list_accounts() $$, '42501', 'not_allowed', 'owners cannot list all accounts');
SELECT throws_ok($$ SELECT * FROM public.admin_list_users() $$, '42501', 'not_allowed', 'owners cannot list users');
SELECT throws_ok(
  $$ SELECT public.admin_set_account_active('91000000-0000-4000-8000-000000000002', false) $$,
  '42501', 'not_allowed', 'owners cannot deactivate accounts'
);

-- Lists ------------------------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('90000000-0000-4000-8000-00000000000a');

SELECT is(public.is_platform_admin(), true, 'a platform admin is one');

SELECT results_eq(
  $$ SELECT slug, owner_email, member_count, total_count FROM public.admin_list_accounts('100%_') $$,
  $$ VALUES ('adm-alpha'::text, 'adm-owner@test.local'::text, 2::bigint, 1::bigint) $$,
  'searching accounts matches the text literally (no LIKE wildcards)'
);

SELECT results_eq(
  $$ SELECT count(*) FROM public.admin_list_accounts('adm-', 1, 0) $$,
  $$ VALUES (1::bigint) $$,
  'the page size limits the rows'
);

SELECT results_eq(
  $$ SELECT total_count FROM public.admin_list_accounts('adm-', 1, 1) $$,
  $$ VALUES (2::bigint) $$,
  'total_count counts all matches, whatever the page'
);

SELECT results_eq(
  $$ SELECT name, account_count, is_platform_admin FROM public.admin_list_users('adm-owner') $$,
  $$ VALUES ('Olga Owner'::text, 2::bigint, false) $$,
  'users are listed with their name and number of accounts'
);

-- Deactivation -----------------------------------------------------------------
SELECT lives_ok(
  $$ SELECT public.admin_set_account_active('91000000-0000-4000-8000-000000000001', false) $$,
  'an admin deactivates an account'
);

RESET ROLE;
SELECT pg_temp.login_as('90000000-0000-4000-8000-00000000000c');

SELECT is_empty(
  $$ SELECT id FROM public.accounts WHERE id = '91000000-0000-4000-8000-000000000001' $$,
  'members lose access to a deactivated account'
);

RESET ROLE;
SELECT pg_temp.login_as('90000000-0000-4000-8000-00000000000a');

SELECT throws_ok(
  $$ SELECT public.admin_set_account_active('91000000-0000-4000-8000-0000000000ff', true) $$,
  'P0002', 'account_not_found', 'an unknown account is reported'
);

SELECT * FROM finish();
ROLLBACK;
