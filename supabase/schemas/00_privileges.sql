-- Deny by default.
--
-- Supabase grants anon/authenticated access to every new object in `public`.
-- We revoke that, so nothing becomes reachable through the Data API until it
-- gets an explicit GRANT next to its definition. Postgres also grants EXECUTE
-- on every new function to PUBLIC; that is revoked too. service_role keeps
-- its defaults: it is the server's admin role and bypasses RLS anyway.
--
-- config.toml keeps `auto_expose_new_tables` at the cloud default, so the
-- local baseline matches hosted projects and these statements land in the
-- generated migration.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM public;

-- `private` holds RLS helpers and SECURITY DEFINER internals. It is not in
-- `[api] schemas`, so nothing here is callable over HTTP. `authenticated`
-- needs USAGE because RLS policies call these helpers as the querying role.
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM public;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
