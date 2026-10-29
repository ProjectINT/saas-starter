-- Sign-up provisioning. raw_user_meta_data is client-controlled
-- (supabase.auth.signUp({ options: { data } })), so it must never grant access.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(10);

-- An existing account the attacker wants to join.
INSERT INTO auth.users (id, email) VALUES ('10000000-0000-4000-8000-000000000001', 'victim@test.local');
INSERT INTO public.accounts (id, slug, name, owner_id)
VALUES ('20000000-0000-4000-8000-000000000001', 'victim-co', 'Victim Co', '10000000-0000-4000-8000-000000000001');
INSERT INTO public.account_members (account_id, user_id, role)
VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner');

-- What GoTrue inserts for a sign-up with forged metadata.
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '10000000-0000-4000-8000-000000000002',
  'mallory@test.local',
  jsonb_build_object(
    'first_name', '  Mallory  ',
    'last_name', repeat('x', 500),
    'role', 'owner',
    'account_role', 'admin',
    'account_id', '20000000-0000-4000-8000-000000000001',
    'is_admin', true,
    'locale', 'ru'
  )
);

SELECT is(
  (SELECT email FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000002'),
  'mallory@test.local',
  'sign-up creates a profile with the auth email'
);

SELECT is(
  (SELECT first_name FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000002'),
  'Mallory',
  'first_name from metadata is trimmed'
);

SELECT is(
  (SELECT char_length(last_name) FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000002'),
  100,
  'oversized metadata is truncated instead of failing the sign-up'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.account_members WHERE user_id = '10000000-0000-4000-8000-000000000002' $$,
  'forged role/account_id in user metadata creates no membership'
);

SELECT is_empty(
  $$ SELECT 1 FROM private.platform_admins WHERE user_id = '10000000-0000-4000-8000-000000000002' $$,
  'forged admin flag in user metadata grants no platform admin'
);

SELECT is(
  (SELECT locale FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000002'),
  'ru',
  'the sign-up language from metadata becomes the profile locale'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('10000000-0000-4000-8000-000000000003', 'blank@test.local', '{"first_name": "   ", "locale": "<script>"}');

SELECT is(
  (SELECT locale FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000003'),
  NULL,
  'a malformed locale in metadata is dropped instead of failing the sign-up'
);

SELECT is(
  (SELECT first_name FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000003'),
  NULL,
  'blank metadata becomes NULL'
);

INSERT INTO auth.users (id, email) VALUES ('10000000-0000-4000-8000-000000000004', 'no-meta@test.local');

SELECT isnt_empty(
  $$ SELECT 1 FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000004' $$,
  'sign-up without metadata works'
);

UPDATE auth.users SET email = 'mallory-new@test.local' WHERE id = '10000000-0000-4000-8000-000000000002';

SELECT is(
  (SELECT email FROM public.profiles WHERE id = '10000000-0000-4000-8000-000000000002'),
  'mallory-new@test.local',
  'email change in auth.users is synced to the profile'
);

SELECT * FROM finish();
ROLLBACK;
