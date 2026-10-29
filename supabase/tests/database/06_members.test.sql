-- Membership RPCs: change_member_role, remove_member, leave_account,
-- transfer_ownership, delete_account. Rank rule: act only on members strictly
-- below your role, assign only roles not above it.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(38);

-- Owner, two admins, two members, an outsider.
INSERT INTO auth.users (id, email) VALUES
  ('60000000-0000-4000-8000-00000000000a', 'm-owner@test.local'),
  ('60000000-0000-4000-8000-00000000000b', 'm-admin@test.local'),
  ('60000000-0000-4000-8000-00000000000c', 'm-admin2@test.local'),
  ('60000000-0000-4000-8000-00000000000d', 'm-member@test.local'),
  ('60000000-0000-4000-8000-00000000000e', 'm-member2@test.local'),
  ('60000000-0000-4000-8000-00000000000f', 'm-outsider@test.local');

INSERT INTO public.accounts (id, slug, name, owner_id) VALUES
  ('61000000-0000-4000-8000-000000000001', 'members-co', 'Members Co', '60000000-0000-4000-8000-00000000000a'),
  ('61000000-0000-4000-8000-000000000002', 'frozen-co', 'Frozen Co', '60000000-0000-4000-8000-00000000000a');

INSERT INTO public.account_members (account_id, user_id, role) VALUES
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000a', 'owner'),
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000b', 'admin'),
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000c', 'admin'),
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000d', 'member'),
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000e', 'member'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-00000000000a', 'owner'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-00000000000d', 'member');

UPDATE public.accounts SET deactivated_at = now() WHERE id = '61000000-0000-4000-8000-000000000002';

CREATE FUNCTION pg_temp.login_as(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

CREATE FUNCTION pg_temp.role_of(p_user_id uuid)
RETURNS public.account_role
LANGUAGE sql
AS $$
  SELECT role FROM public.account_members
  WHERE account_id = '61000000-0000-4000-8000-000000000001' AND user_id = p_user_id;
$$;

-- change_member_role ----------------------------------------------------------
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000d');

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000e', 'admin') $$,
  '42501', 'not_allowed', 'a member cannot change roles'
);

RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000b');

SELECT lives_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000e', 'admin') $$,
  'an admin can promote a member to admin'
);

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000e', 'member') $$,
  '42501', 'not_allowed', 'an admin cannot change another admin'
);

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000b', 'member') $$,
  '42501', 'not_allowed', 'an admin cannot change their own role'
);

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000a', 'member') $$,
  '42501', 'not_allowed', 'an admin cannot change the owner'
);

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000d', 'owner') $$,
  '22023', 'invalid_role', 'nobody is made owner through a role change'
);

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000f', 'member') $$,
  'P0002', 'member_not_found', 'changing a non-member reports member_not_found'
);

RESET ROLE;

SELECT is(pg_temp.role_of('60000000-0000-4000-8000-00000000000e'), 'admin'::public.account_role, 'the promotion took effect');

SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000a');

SELECT lives_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000e', 'member') $$,
  'the owner can demote an admin'
);

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-00000000000d', 'admin') $$,
  '42501', 'not_allowed', 'nothing changes in a deactivated account'
);

RESET ROLE;

SELECT is(pg_temp.role_of('60000000-0000-4000-8000-00000000000e'), 'member'::public.account_role, 'the demotion took effect');

SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000f');

SELECT throws_ok(
  $$ SELECT public.change_member_role('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000d', 'admin') $$,
  '42501', 'not_allowed', 'an outsider cannot change roles'
);

-- remove_member ---------------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000d');

SELECT throws_ok(
  $$ SELECT public.remove_member('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000e') $$,
  '42501', 'not_allowed', 'a member cannot remove members'
);

RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000b');

SELECT throws_ok(
  $$ SELECT public.remove_member('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000c') $$,
  '42501', 'not_allowed', 'an admin cannot remove another admin'
);

SELECT throws_ok(
  $$ SELECT public.remove_member('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000a') $$,
  '42501', 'not_allowed', 'an admin cannot remove the owner'
);

SELECT throws_ok(
  $$ SELECT public.remove_member('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000b') $$,
  '42501', 'not_allowed', 'remove_member does not remove oneself'
);

SELECT lives_ok(
  $$ SELECT public.remove_member('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000e') $$,
  'an admin can remove a member'
);

RESET ROLE;

SELECT is(pg_temp.role_of('60000000-0000-4000-8000-00000000000e'), NULL, 'the removed member is gone');

SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000a');

SELECT lives_ok(
  $$ SELECT public.remove_member('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000c') $$,
  'the owner can remove an admin'
);

-- leave_account ---------------------------------------------------------------
SELECT throws_ok(
  $$ SELECT public.leave_account('61000000-0000-4000-8000-000000000001') $$,
  '22023', 'owner_cannot_leave', 'the owner cannot leave'
);

RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000d');

SELECT lives_ok(
  $$ SELECT public.leave_account('61000000-0000-4000-8000-000000000001') $$,
  'a member can leave'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.accounts WHERE id = '61000000-0000-4000-8000-000000000001' $$,
  'after leaving, the account is no longer visible'
);

RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000f');

SELECT throws_ok(
  $$ SELECT public.leave_account('61000000-0000-4000-8000-000000000001') $$,
  'P0002', 'member_not_found', 'an outsider has nothing to leave'
);

-- transfer_ownership ----------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000b');

SELECT throws_ok(
  $$ SELECT public.transfer_ownership('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000b') $$,
  '42501', 'not_allowed', 'an admin cannot take ownership'
);

RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000a');

SELECT throws_ok(
  $$ SELECT public.transfer_ownership('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000a') $$,
  'P0002', 'member_not_found', 'ownership cannot be transferred to oneself'
);

SELECT throws_ok(
  $$ SELECT public.transfer_ownership('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000f') $$,
  'P0002', 'member_not_found', 'ownership goes only to a member'
);

SELECT throws_ok(
  $$ SELECT public.transfer_ownership('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-00000000000d') $$,
  '42501', 'not_allowed', 'a deactivated account cannot be transferred'
);

SELECT lives_ok(
  $$ SELECT public.transfer_ownership('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000b') $$,
  'the owner can hand the account to an admin'
);

RESET ROLE;

SELECT is(
  (SELECT owner_id FROM public.accounts WHERE id = '61000000-0000-4000-8000-000000000001'),
  '60000000-0000-4000-8000-00000000000b'::uuid,
  'accounts.owner_id moved to the new owner'
);

SELECT is(pg_temp.role_of('60000000-0000-4000-8000-00000000000b'), 'owner'::public.account_role, 'the new owner has the owner role');
SELECT is(pg_temp.role_of('60000000-0000-4000-8000-00000000000a'), 'admin'::public.account_role, 'the previous owner became admin');

SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000a');

SELECT throws_ok(
  $$ SELECT public.transfer_ownership('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-00000000000a') $$,
  '42501', 'not_allowed', 'the previous owner cannot take it back'
);

-- delete_account --------------------------------------------------------------
SELECT throws_ok(
  $$ SELECT public.delete_account('61000000-0000-4000-8000-000000000001') $$,
  '42501', 'not_allowed', 'an admin cannot delete the account'
);

RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000a');

SELECT throws_ok(
  $$ SELECT public.delete_account('61000000-0000-4000-8000-000000000002') $$,
  '42501', 'not_allowed', 'a deactivated account cannot be deleted by its owner'
);

RESET ROLE;
SELECT pg_temp.login_as('60000000-0000-4000-8000-00000000000b');

SELECT lives_ok(
  $$ SELECT public.delete_account('61000000-0000-4000-8000-000000000001') $$,
  'the owner can delete the account'
);

RESET ROLE;

SELECT is_empty(
  $$ SELECT 1 FROM public.accounts WHERE id = '61000000-0000-4000-8000-000000000001' $$,
  'the account is gone'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.account_members WHERE account_id = '61000000-0000-4000-8000-000000000001' $$,
  'its memberships are gone'
);

-- Anonymous -------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role": "anon"}', true);
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ SELECT public.remove_member('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-00000000000d') $$,
  '42501', NULL, 'anon cannot call membership RPCs'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
