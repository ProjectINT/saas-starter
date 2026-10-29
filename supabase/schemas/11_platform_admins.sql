-- Platform (super) admins: operators of the SaaS itself, not of a tenant.
--
-- Lives in `private`: no client can read or change it. Grant admin rights
-- with SQL (or the service role), e.g.:
--   INSERT INTO private.platform_admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'you@example.com';

CREATE TABLE IF NOT EXISTS private.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE private.platform_admins IS 'Users with platform-wide admin rights. Check with private.is_platform_admin().';
