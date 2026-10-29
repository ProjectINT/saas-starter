-- Invitations: create/revoke (members.invite + rank rule), lookup by link
-- token, acceptance bound to the confirmed email, decline, expiry,
-- deactivated accounts, direct writes.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(39);

-- Owner, admin, member; the invitee, another user, a user with an unconfirmed email.
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('70000000-0000-4000-8000-00000000000a', 'i-owner@test.local', now(), '{}'),
  ('70000000-0000-4000-8000-00000000000b', 'i-admin@test.local', now(), '{"first_name": "Ada", "last_name": "Admin"}'),
  ('70000000-0000-4000-8000-00000000000c', 'i-member@test.local', now(), '{}'),
  ('70000000-0000-4000-8000-00000000000d', 'i-invitee@test.local', now(), '{}'),
  ('70000000-0000-4000-8000-00000000000e', 'i-other@test.local', now(), '{}'),
  ('70000000-0000-4000-8000-00000000000f', 'i-unconfirmed@test.local', NULL, '{}');

INSERT INTO public.accounts (id, slug, name, owner_id)
VALUES ('71000000-0000-4000-8000-000000000001', 'invite-co', 'Invite Co', '70000000-0000-4000-8000-00000000000a');

INSERT INTO public.account_members (account_id, user_id, role) VALUES
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-00000000000a', 'owner'),
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-00000000000b', 'admin'),
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-00000000000c', 'member');

CREATE FUNCTION pg_temp.login_as(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

-- Id of the open invitation for an email (as superuser).
CREATE FUNCTION pg_temp.open_invitation(p_email text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT id::text FROM public.account_invitations
  WHERE email = p_email AND accepted_at IS NULL AND declined_at IS NULL AND revoked_at IS NULL;
$$;

-- create_invitation -----------------------------------------------------------
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000c');

SELECT throws_ok(
  $$ SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', 'new@test.local', 'member') $$,
  '42501', 'not_allowed', 'a member cannot invite'
);

RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000b');

SELECT throws_ok(
  $$ SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', 'new@test.local', 'owner') $$,
  '22023', 'invalid_role', 'nobody is invited as owner'
);

SELECT throws_ok(
  $$ SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', ' I-Member@Test.local ', 'member') $$,
  '23505', 'already_member', 'inviting a member is rejected (email compared case-insensitively)'
);

SELECT throws_ok(
  $$ SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', 'not-an-email', 'member') $$,
  '23514', NULL, 'a malformed email is rejected'
);

SELECT lives_ok(
  $$ SELECT set_config('test.first_token', public.create_invitation('71000000-0000-4000-8000-000000000001', ' I-Invitee@Test.Local ', 'member'), true) $$,
  'an admin can invite'
);

SELECT ok(current_setting('test.first_token') ~ '^[A-Za-z0-9_-]{43}$', 'the token is 43 base64url characters');

SELECT lives_ok(
  $$ SELECT set_config('test.token', public.create_invitation('71000000-0000-4000-8000-000000000001', 'i-invitee@test.local', 'admin'), true) $$,
  'inviting the same email again is allowed'
);

SELECT is(
  (SELECT count(*) FROM public.account_invitations WHERE email = 'i-invitee@test.local' AND revoked_at IS NULL),
  1::bigint,
  'the admin sees one open invitation: the new one replaced the old'
);

SELECT throws_ok(
  $$ SELECT token_hash FROM public.account_invitations $$,
  '42501', NULL, 'token hashes are not readable'
);

SELECT throws_ok(
  $$ INSERT INTO public.account_invitations (account_id, email, role, token_hash, expires_at)
     VALUES ('71000000-0000-4000-8000-000000000001', 'direct@test.local', 'admin', '\x00', now() + interval '1 day') $$,
  '42501', NULL, 'invitations cannot be inserted directly'
);

SELECT throws_ok(
  $$ UPDATE public.account_invitations SET role = 'member' $$,
  '42501', NULL, 'invitations cannot be updated directly'
);

RESET ROLE;

SELECT isnt_empty(
  $$ SELECT 1 FROM public.account_invitations
     WHERE token_hash = sha256(convert_to(current_setting('test.token'), 'UTF8')) AND email = 'i-invitee@test.local' $$,
  'only the token hash is stored, with a lowercase email'
);

SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000c');

SELECT is_empty(
  $$ SELECT 1 FROM public.account_invitations $$,
  'a member without members.invite sees no invitations'
);

-- get_invitation --------------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000e');

SELECT results_eq(
  $$ SELECT account_name, email, role::text, inviter_name, status FROM public.get_invitation(current_setting('test.token')) $$,
  $$ VALUES ('Invite Co', 'i-invitee@test.local', 'admin', 'Ada Admin', 'pending') $$,
  'anyone signed in with the link sees the invitation'
);

SELECT is(
  (SELECT status FROM public.get_invitation(current_setting('test.first_token'))),
  'revoked',
  'the replaced link reports revoked'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.get_invitation('no-such-token') $$,
  'an unknown token finds nothing'
);

-- Accepting is bound to the invited email ------------------------------------
SELECT is_empty(
  $$ SELECT 1 FROM public.list_my_invitations() $$,
  'another user does not get the invitation listed'
);

SELECT throws_ok(
  format('SELECT public.accept_invitation(%L)', (SELECT id FROM public.get_invitation(current_setting('test.token')))),
  'P0002', 'invitation_not_found', 'another user cannot accept it, even with the link'
);

RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000b');
SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', 'i-unconfirmed@test.local', 'member');
RESET ROLE;
SELECT set_config('test.unconfirmed_id', pg_temp.open_invitation('i-unconfirmed@test.local'), true);
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000f');

SELECT is_empty(
  $$ SELECT 1 FROM public.list_my_invitations() $$,
  'nothing is listed for an unconfirmed email'
);

SELECT throws_ok(
  $$ SELECT public.accept_invitation(current_setting('test.unconfirmed_id')::uuid) $$,
  'P0002', 'invitation_not_found', 'an unconfirmed email cannot accept'
);

RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000d');

SELECT results_eq(
  $$ SELECT account_name, role::text, inviter_name FROM public.list_my_invitations() $$,
  $$ VALUES ('Invite Co', 'admin', 'Ada Admin') $$,
  'the invitee gets the pending invitation listed'
);

SELECT is(
  (SELECT slug FROM public.accept_invitation((SELECT id FROM public.list_my_invitations()))),
  'invite-co',
  'the invitee accepts and gets the account back'
);

SELECT is(
  (SELECT role FROM public.account_members
   WHERE account_id = '71000000-0000-4000-8000-000000000001' AND user_id = '70000000-0000-4000-8000-00000000000d'),
  'admin'::public.account_role,
  'the invitee joined with the invited role'
);

SELECT is(
  (SELECT status FROM public.get_invitation(current_setting('test.token'))),
  'accepted',
  'the invitation is closed as accepted'
);

SELECT throws_ok(
  format('SELECT public.accept_invitation(%L)', (SELECT id FROM public.get_invitation(current_setting('test.token')))),
  '22023', 'invitation_closed', 'an invitation is accepted only once'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.list_my_invitations() $$,
  'nothing is pending after acceptance'
);

-- revoke_invitation -----------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000b');
SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', 'i-other@test.local', 'member');
RESET ROLE;
SELECT set_config('test.other_id', pg_temp.open_invitation('i-other@test.local'), true);
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000c');

SELECT throws_ok(
  $$ SELECT public.revoke_invitation(current_setting('test.other_id')::uuid) $$,
  'P0002', 'invitation_not_found', 'a member cannot revoke invitations'
);

RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000b');

SELECT lives_ok(
  $$ SELECT public.revoke_invitation(current_setting('test.other_id')::uuid) $$,
  'an admin can revoke an invitation'
);

SELECT throws_ok(
  $$ SELECT public.revoke_invitation(current_setting('test.other_id')::uuid) $$,
  '22023', 'invitation_closed', 'a revoked invitation cannot be revoked again'
);

RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000e');

SELECT throws_ok(
  $$ SELECT public.accept_invitation(current_setting('test.other_id')::uuid) $$,
  '22023', 'invitation_closed', 'a revoked invitation cannot be accepted'
);

-- decline_invitation ----------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000b');
SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', 'i-other@test.local', 'member');
RESET ROLE;
SELECT set_config('test.other_id', pg_temp.open_invitation('i-other@test.local'), true);
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000e');

SELECT lives_ok(
  $$ SELECT public.decline_invitation(current_setting('test.other_id')::uuid) $$,
  'the invitee can decline'
);

SELECT throws_ok(
  $$ SELECT public.accept_invitation(current_setting('test.other_id')::uuid) $$,
  '22023', 'invitation_closed', 'a declined invitation cannot be accepted'
);

-- Expiry ------------------------------------------------------------------------
RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000b');
SELECT set_config('test.expired_token', public.create_invitation('71000000-0000-4000-8000-000000000001', 'i-other@test.local', 'member'), true);
RESET ROLE;
SELECT set_config('test.other_id', pg_temp.open_invitation('i-other@test.local'), true);
UPDATE public.account_invitations SET expires_at = now() - interval '1 minute' WHERE id = current_setting('test.other_id')::uuid;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000e');

SELECT is(
  (SELECT status FROM public.get_invitation(current_setting('test.expired_token'))),
  'expired',
  'an invitation past expires_at reports expired'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.list_my_invitations() $$,
  'expired invitations are not listed'
);

SELECT throws_ok(
  $$ SELECT public.accept_invitation(current_setting('test.other_id')::uuid) $$,
  '22023', 'invitation_expired', 'an expired invitation cannot be accepted'
);

-- Deactivated account -------------------------------------------------------------
RESET ROLE;
UPDATE public.account_invitations SET expires_at = now() + interval '1 day' WHERE id = current_setting('test.other_id')::uuid;
UPDATE public.accounts SET deactivated_at = now() WHERE id = '71000000-0000-4000-8000-000000000001';
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000e');

SELECT is_empty(
  $$ SELECT 1 FROM public.get_invitation(current_setting('test.expired_token')) $$,
  'invitations of a deactivated account are not found by link'
);

SELECT throws_ok(
  $$ SELECT public.accept_invitation(current_setting('test.other_id')::uuid) $$,
  'P0002', 'invitation_not_found', 'invitations of a deactivated account cannot be accepted'
);

RESET ROLE;
SELECT pg_temp.login_as('70000000-0000-4000-8000-00000000000b');

SELECT throws_ok(
  $$ SELECT public.create_invitation('71000000-0000-4000-8000-000000000001', 'later@test.local', 'member') $$,
  '42501', 'not_allowed', 'a deactivated account cannot invite'
);

-- Anonymous -------------------------------------------------------------------------
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"role": "anon"}', true);
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ SELECT * FROM public.get_invitation('anything') $$,
  '42501', NULL, 'anon cannot look up invitations'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
