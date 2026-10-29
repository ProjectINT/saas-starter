-- Invitation limits: at most 50 pending invitations per account and 50 sent
-- per inviter a day, so invitations cannot be used to send bulk email.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(6);

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('80000000-0000-4000-8000-00000000000a', 'l-owner@test.local', now(), '{}'),
  ('80000000-0000-4000-8000-00000000000b', 'l-other@test.local', now(), '{}');

INSERT INTO public.accounts (id, slug, name, owner_id) VALUES
  ('81000000-0000-4000-8000-000000000001', 'limit-co', 'Limit Co', '80000000-0000-4000-8000-00000000000a'),
  ('81000000-0000-4000-8000-000000000002', 'limit-two', 'Limit Two', '80000000-0000-4000-8000-00000000000a');

INSERT INTO public.account_members (account_id, user_id, role) VALUES
  ('81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-00000000000a', 'owner'),
  ('81000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-00000000000a', 'owner');

CREATE FUNCTION pg_temp.login_as(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

-- Per account -----------------------------------------------------------------
-- 49 pending invitations sent by someone else, plus a closed and an expired
-- one that do not count.
INSERT INTO public.account_invitations (account_id, email, role, token_hash, invited_by, expires_at)
SELECT '81000000-0000-4000-8000-000000000001', 'p' || n || '@test.local', 'member',
  sha256(convert_to('pending-' || n, 'UTF8')), '80000000-0000-4000-8000-00000000000b', now() + interval '7 days'
FROM generate_series(1, 49) AS n;

INSERT INTO public.account_invitations (account_id, email, role, token_hash, invited_by, expires_at, revoked_at) VALUES
  ('81000000-0000-4000-8000-000000000001', 'closed@test.local', 'member', sha256(convert_to('closed', 'UTF8')),
   '80000000-0000-4000-8000-00000000000b', now() + interval '7 days', now());

INSERT INTO public.account_invitations (account_id, email, role, token_hash, invited_by, expires_at) VALUES
  ('81000000-0000-4000-8000-000000000001', 'expired@test.local', 'member', sha256(convert_to('expired', 'UTF8')),
   '80000000-0000-4000-8000-00000000000b', now() - interval '1 day');

SELECT pg_temp.login_as('80000000-0000-4000-8000-00000000000a');

SELECT lives_ok(
  $$ SELECT public.create_invitation('81000000-0000-4000-8000-000000000001', 'fifty@test.local', 'member') $$,
  'the 50th pending invitation is allowed (closed and expired ones do not count)'
);

SELECT throws_ok(
  $$ SELECT public.create_invitation('81000000-0000-4000-8000-000000000001', 'fifty-one@test.local', 'member') $$,
  'PT429', 'invitation_limit_reached', 'an account holds at most 50 pending invitations'
);

SELECT lives_ok(
  $$ SELECT public.create_invitation('81000000-0000-4000-8000-000000000001', 'fifty@test.local', 'admin') $$,
  'inviting a pending email again at the limit replaces its invitation'
);

-- Per inviter -----------------------------------------------------------------
-- The owner has sent 2 invitations today (fifty@ twice); 48 more in another
-- account, all withdrawn, make 50.
RESET ROLE;

INSERT INTO public.account_invitations (account_id, email, role, token_hash, invited_by, expires_at, revoked_at)
SELECT '81000000-0000-4000-8000-000000000002', 'd' || n || '@test.local', 'member',
  sha256(convert_to('daily-' || n, 'UTF8')), '80000000-0000-4000-8000-00000000000a', now() + interval '7 days', now()
FROM generate_series(1, 48) AS n;

SELECT pg_temp.login_as('80000000-0000-4000-8000-00000000000a');

SELECT throws_ok(
  $$ SELECT public.create_invitation('81000000-0000-4000-8000-000000000002', 'next@test.local', 'member') $$,
  'PT429', 'invitation_limit_reached', 'an inviter sends at most 50 invitations a day, across accounts'
);

RESET ROLE;
UPDATE public.account_invitations
SET created_at = now() - interval '25 hours'
WHERE invited_by = '80000000-0000-4000-8000-00000000000a';

SELECT pg_temp.login_as('80000000-0000-4000-8000-00000000000a');

SELECT lives_ok(
  $$ SELECT public.create_invitation('81000000-0000-4000-8000-000000000002', 'next@test.local', 'member') $$,
  'invitations older than a day do not count'
);

-- The welcome-email marker is server-owned ---------------------------------
SELECT throws_ok(
  $$ UPDATE public.profiles SET welcome_email_sent_at = now() WHERE id = '80000000-0000-4000-8000-00000000000a' $$,
  '42501', NULL, 'clients cannot set welcome_email_sent_at'
);

SELECT * FROM finish();
ROLLBACK;
