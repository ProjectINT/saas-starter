-- Local development data. Runs on `supabase db reset` only, never in production.
--
-- Users (password for all: password123):
--   alice@example.com  owner of "acme", platform admin (/admin)
--   bob@example.com    member of "acme"
--   carol@example.com  no accounts (goes to onboarding)

DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN
    SELECT *
    FROM (VALUES
      ('a1111111-1111-4111-8111-111111111111'::uuid, 'alice@example.com', 'Alice', 'Owner'),
      ('b2222222-2222-4222-8222-222222222222'::uuid, 'bob@example.com', 'Bob', 'Member'),
      ('c3333333-3333-4333-8333-333333333333'::uuid, 'carol@example.com', 'Carol', 'Newcomer')
    ) AS u (id, email, first_name, last_name)
  LOOP
    -- Token columns must be '' rather than NULL, otherwise GoTrue fails to sign in.
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_user.id, 'authenticated', 'authenticated',
      v_user.email, extensions.crypt('password123', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('first_name', v_user.first_name, 'last_name', v_user.last_name),
      now(), now(),
      '', '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user.id, v_user.id::text, 'email',
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true),
      now(), now(), now()
    );
  END LOOP;
END;
$$;

INSERT INTO public.accounts (id, slug, name, owner_id)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'acme', 'Acme Inc.', 'a1111111-1111-4111-8111-111111111111');

INSERT INTO public.account_members (account_id, user_id, role, invited_by)
VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 'owner', NULL),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'b2222222-2222-4222-8222-222222222222', 'member', 'a1111111-1111-4111-8111-111111111111');

INSERT INTO private.platform_admins (user_id)
VALUES ('a1111111-1111-4111-8111-111111111111');
