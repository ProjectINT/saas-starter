-- Tenancy: create_account, accounts/account_members RLS, owner invariants,
-- deactivation, anon access.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(36);

-- Alice (owner), Bob (outsider, later member), Carol (outsider).
INSERT INTO auth.users (id, email) VALUES
  ('30000000-0000-4000-8000-00000000000a', 't-alice@test.local'),
  ('30000000-0000-4000-8000-00000000000b', 't-bob@test.local'),
  ('30000000-0000-4000-8000-00000000000c', 't-carol@test.local');

CREATE FUNCTION pg_temp.login_as(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

CREATE FUNCTION pg_temp.login_anon()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  PERFORM set_config('role', 'anon', true);
END;
$$;

-- Alice creates accounts --------------------------------------------------
SELECT pg_temp.login_as('30000000-0000-4000-8000-00000000000a');

SELECT lives_ok(
  $$ SELECT public.create_account('Test Co', 'test-co') $$,
  'a signed-in user can create an account'
);

SELECT is(
  (SELECT m.role FROM public.account_members m JOIN public.accounts a ON a.id = m.account_id
   WHERE a.slug = 'test-co' AND m.user_id = '30000000-0000-4000-8000-00000000000a'),
  'owner'::public.account_role,
  'the creator becomes the owner member'
);

SELECT is(
  (SELECT owner_id FROM public.accounts WHERE slug = 'test-co'),
  '30000000-0000-4000-8000-00000000000a'::uuid,
  'accounts.owner_id is the creator'
);

SELECT is(
  (SELECT slug FROM public.create_account('Second Co', '  Second-CO ')),
  'second-co',
  'slug is trimmed and lowercased'
);

SELECT throws_ok(
  $$ SELECT public.create_account('Admin', 'admin') $$,
  '23514', NULL, 'reserved slug is rejected'
);

SELECT throws_ok(
  $$ SELECT public.create_account('Bad', 'bad slug!') $$,
  '23514', NULL, 'slug with invalid characters is rejected'
);

SELECT throws_ok(
  $$ SELECT public.create_account('Short', 'ab') $$,
  '23514', NULL, 'slug shorter than 3 chars is rejected'
);

SELECT throws_ok(
  $$ SELECT public.create_account('Dup', 'test-co') $$,
  '23505', NULL, 'taken slug is rejected'
);

SELECT throws_ok(
  $$ SELECT public.create_account('   ', 'blank-name') $$,
  '23514', NULL, 'blank name is rejected'
);

SELECT ok(
  private.has_permission((SELECT id FROM public.accounts WHERE slug = 'test-co'), 'account.delete'),
  'owner has account.delete'
);

UPDATE public.accounts SET name = 'Test Co Renamed' WHERE slug = 'test-co';

SELECT is(
  (SELECT name FROM public.accounts WHERE slug = 'test-co'),
  'Test Co Renamed',
  'owner can rename the account'
);

SELECT throws_ok(
  $$ UPDATE public.accounts SET owner_id = '30000000-0000-4000-8000-00000000000b' WHERE slug = 'test-co' $$,
  '42501', NULL, 'owner_id cannot be changed by clients'
);

SELECT throws_ok(
  $$ UPDATE public.accounts SET deactivated_at = NULL WHERE slug = 'test-co' $$,
  '42501', NULL, 'deactivated_at cannot be changed by clients'
);

SELECT throws_ok(
  $$ INSERT INTO public.account_members (account_id, user_id, role)
     SELECT id, '30000000-0000-4000-8000-00000000000b', 'admin' FROM public.accounts WHERE slug = 'test-co' $$,
  '42501', NULL, 'even the owner cannot insert members directly'
);

SELECT throws_ok(
  $$ INSERT INTO public.accounts (slug, name, owner_id) VALUES ('direct', 'Direct', '30000000-0000-4000-8000-00000000000a') $$,
  '42501', NULL, 'accounts cannot be inserted directly'
);

SELECT throws_ok(
  $$ DELETE FROM public.accounts WHERE slug = 'test-co' $$,
  '42501', NULL, 'accounts cannot be deleted directly'
);

-- Bob is not a member ------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('30000000-0000-4000-8000-00000000000b');

SELECT is_empty(
  $$ SELECT 1 FROM public.accounts WHERE slug = 'test-co' $$,
  'outsider does not see the account'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.account_members $$,
  'outsider sees no memberships'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.profiles WHERE id = '30000000-0000-4000-8000-00000000000a' $$,
  'outsider does not see the owner profile'
);

UPDATE public.accounts SET name = 'Hacked' WHERE slug = 'test-co';

RESET ROLE;

SELECT is(
  (SELECT name FROM public.accounts WHERE slug = 'test-co'),
  'Test Co Renamed',
  'outsider update changes nothing'
);

-- Bob becomes a member (as a server-side function would do it) -------------
INSERT INTO public.account_members (account_id, user_id, role, invited_by)
SELECT id, '30000000-0000-4000-8000-00000000000b', 'member', '30000000-0000-4000-8000-00000000000a'
FROM public.accounts
WHERE slug = 'test-co';

SELECT pg_temp.login_as('30000000-0000-4000-8000-00000000000b');

SELECT isnt_empty(
  $$ SELECT 1 FROM public.accounts WHERE slug = 'test-co' $$,
  'member sees the account'
);

SELECT is(
  (SELECT count(*) FROM public.account_members m JOIN public.accounts a ON a.id = m.account_id WHERE a.slug = 'test-co'),
  2::bigint,
  'member sees the roster (members.view)'
);

SELECT isnt_empty(
  $$ SELECT 1 FROM public.profiles WHERE id = '30000000-0000-4000-8000-00000000000a' $$,
  'member sees co-member profiles'
);

SELECT ok(
  NOT private.has_permission((SELECT id FROM public.accounts WHERE slug = 'test-co'), 'account.update'),
  'member lacks account.update'
);

UPDATE public.accounts SET name = 'By Bob' WHERE slug = 'test-co';

RESET ROLE;

SELECT is(
  (SELECT name FROM public.accounts WHERE slug = 'test-co'),
  'Test Co Renamed',
  'member without account.update cannot rename'
);

-- Carol still sees nothing -------------------------------------------------
SELECT pg_temp.login_as('30000000-0000-4000-8000-00000000000c');

SELECT is_empty(
  $$ SELECT 1 FROM public.accounts $$,
  'user without memberships sees no accounts'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.profiles
     WHERE id IN ('30000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000b') $$,
  'user without memberships sees no other profiles'
);

RESET ROLE;

-- Owner invariants ----------------------------------------------------------
SELECT throws_ok(
  $$ INSERT INTO public.account_members (account_id, user_id, role)
     SELECT id, '30000000-0000-4000-8000-00000000000c', 'owner' FROM public.accounts WHERE slug = 'test-co' $$,
  '23514', NULL, 'only accounts.owner_id can hold the owner role'
);

SELECT throws_ok(
  $$ UPDATE public.account_members SET role = 'owner' WHERE user_id = '30000000-0000-4000-8000-00000000000b' $$,
  '23514', NULL, 'a member cannot be promoted to owner without an ownership transfer'
);

SELECT throws_ok(
  $$ DELETE FROM auth.users WHERE id = '30000000-0000-4000-8000-00000000000a' $$,
  '23503', NULL, 'a user who owns accounts cannot be deleted'
);

-- Deactivated accounts grant nothing ---------------------------------------
UPDATE public.accounts SET deactivated_at = now() WHERE slug = 'test-co';

SELECT pg_temp.login_as('30000000-0000-4000-8000-00000000000a');

SELECT is_empty(
  $$ SELECT 1 FROM public.accounts WHERE slug = 'test-co' $$,
  'deactivated account is hidden from its owner'
);

SELECT isnt_empty(
  $$ SELECT 1 FROM public.accounts WHERE slug = 'second-co' $$,
  'other accounts of the owner stay visible'
);

UPDATE public.accounts SET name = 'While Deactivated' WHERE slug = 'test-co';

RESET ROLE;

SELECT is(
  (SELECT name FROM public.accounts WHERE slug = 'test-co'),
  'Test Co Renamed',
  'deactivated account cannot be changed by its owner'
);

SELECT pg_temp.login_as('30000000-0000-4000-8000-00000000000b');

SELECT is_empty(
  $$ SELECT 1 FROM public.profiles WHERE id = '30000000-0000-4000-8000-00000000000a' $$,
  'co-member profiles are hidden once the shared account is deactivated'
);

RESET ROLE;

-- Anonymous ---------------------------------------------------------------
SELECT pg_temp.login_anon();

SELECT throws_ok(
  $$ SELECT 1 FROM public.accounts $$,
  '42501', NULL, 'anon cannot read accounts'
);

SELECT throws_ok(
  $$ SELECT public.create_account('Anon Co', 'anon-co') $$,
  '42501', NULL, 'anon cannot create accounts'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
