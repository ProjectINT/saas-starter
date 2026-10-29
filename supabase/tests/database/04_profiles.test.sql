-- Profiles: own edits, column-level protection, visibility between members.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(8);

INSERT INTO auth.users (id, email) VALUES
  ('40000000-0000-4000-8000-00000000000a', 'p-alice@test.local'),
  ('40000000-0000-4000-8000-00000000000b', 'p-bob@test.local'),
  ('40000000-0000-4000-8000-00000000000c', 'p-carol@test.local');

UPDATE public.profiles SET first_name = 'Bob' WHERE id = '40000000-0000-4000-8000-00000000000b';

INSERT INTO public.accounts (id, slug, name, owner_id)
VALUES ('41000000-0000-4000-8000-000000000001', 'profile-co', 'Profile Co', '40000000-0000-4000-8000-00000000000a');

INSERT INTO public.account_members (account_id, user_id, role) VALUES
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-00000000000a', 'owner'),
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-00000000000b', 'member');

CREATE FUNCTION pg_temp.login_as(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

SELECT pg_temp.login_as('40000000-0000-4000-8000-00000000000a');

UPDATE public.profiles SET first_name = 'Alicia', locale = 'pt-BR' WHERE id = '40000000-0000-4000-8000-00000000000a';

SELECT is(
  (SELECT first_name || ' ' || locale FROM public.profiles WHERE id = '40000000-0000-4000-8000-00000000000a'),
  'Alicia pt-BR',
  'user can edit own profile fields'
);

SELECT throws_ok(
  $$ UPDATE public.profiles SET email = 'spoof@test.local' WHERE id = '40000000-0000-4000-8000-00000000000a' $$,
  '42501', NULL, 'email is read-only for clients'
);

SELECT throws_ok(
  $$ UPDATE public.profiles SET created_at = now() WHERE id = '40000000-0000-4000-8000-00000000000a' $$,
  '42501', NULL, 'timestamps are read-only for clients'
);

SELECT throws_ok(
  $$ UPDATE public.profiles SET locale = 'not a locale' WHERE id = '40000000-0000-4000-8000-00000000000a' $$,
  '23514', NULL, 'locale must look like a BCP 47 tag'
);

SELECT isnt_empty(
  $$ SELECT 1 FROM public.profiles WHERE id = '40000000-0000-4000-8000-00000000000b' $$,
  'co-member profile is visible'
);

UPDATE public.profiles SET first_name = 'Hacked' WHERE id = '40000000-0000-4000-8000-00000000000b';

RESET ROLE;

SELECT is(
  (SELECT first_name FROM public.profiles WHERE id = '40000000-0000-4000-8000-00000000000b'),
  'Bob',
  'user cannot edit another user''s profile'
);

SELECT pg_temp.login_as('40000000-0000-4000-8000-00000000000c');

SELECT results_eq(
  $$ SELECT id FROM public.profiles $$,
  $$ VALUES ('40000000-0000-4000-8000-00000000000c'::uuid) $$,
  'user without shared accounts sees only own profile'
);

RESET ROLE;

DELETE FROM auth.users WHERE id = '40000000-0000-4000-8000-00000000000c';

SELECT is_empty(
  $$ SELECT 1 FROM public.profiles WHERE id = '40000000-0000-4000-8000-00000000000c' $$,
  'deleting an auth user without accounts removes the profile'
);

SELECT * FROM finish();
ROLLBACK;
