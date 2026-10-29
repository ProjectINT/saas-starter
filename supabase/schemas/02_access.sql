-- Access helpers for RLS policies and RPCs.
--
-- SECURITY DEFINER lets them read membership tables without triggering those
-- tables' own policies (no recursion). Each one answers a question about the
-- *current* user only (auth.uid()), so exposing EXECUTE to `authenticated` is
-- safe. They live in `private` and are not callable over the Data API.
--
-- A deactivated account grants nothing: every helper requires
-- accounts.deactivated_at IS NULL.
--
-- Written in plpgsql on purpose: bodies are resolved at call time, so tables
-- declared in later files can use these helpers in their policies.

CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM private.platform_admins pa
    WHERE pa.user_id = (SELECT auth.uid())
  );
END;
$$;

COMMENT ON FUNCTION private.is_platform_admin() IS 'True if the current user is a platform (super) admin.';

CREATE OR REPLACE FUNCTION private.is_account_member(p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.account_members m
    JOIN public.accounts a ON a.id = m.account_id
    WHERE m.account_id = p_account_id
      AND m.user_id = (SELECT auth.uid())
      AND a.deactivated_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION private.is_account_member(uuid) IS 'True if the current user is a member of the active account.';

CREATE OR REPLACE FUNCTION private.has_permission(p_account_id uuid, p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.account_members m
    JOIN public.accounts a ON a.id = m.account_id
    JOIN public.role_permissions rp ON rp.role = m.role
    WHERE m.account_id = p_account_id
      AND m.user_id = (SELECT auth.uid())
      AND a.deactivated_at IS NULL
      AND rp.permission = p_permission
  );
END;
$$;

COMMENT ON FUNCTION private.has_permission(uuid, text) IS
'True if the current user''s role in the active account grants the permission (see public.role_permissions). The single source of truth for RLS and RPC checks.';

-- Not granted to clients: RPC internals use it to compare roles
-- (`v_target_role > v_my_role` = target is less privileged).
CREATE OR REPLACE FUNCTION private.member_role(p_account_id uuid)
RETURNS public.account_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT m.role
    FROM public.account_members m
    JOIN public.accounts a ON a.id = m.account_id
    WHERE m.account_id = p_account_id
      AND m.user_id = (SELECT auth.uid())
      AND a.deactivated_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION private.member_role(uuid) IS 'Role of the current user in the active account, or NULL. For RPC internals; not granted to clients.';

CREATE OR REPLACE FUNCTION private.can_view_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.account_members mine
    JOIN public.accounts a ON a.id = mine.account_id
    JOIN public.role_permissions rp ON rp.role = mine.role AND rp.permission = 'members.view'
    JOIN public.account_members theirs ON theirs.account_id = mine.account_id
    WHERE mine.user_id = (SELECT auth.uid())
      AND theirs.user_id = p_user_id
      AND a.deactivated_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION private.can_view_profile(uuid) IS
'True if the user is a member of an active account where the current user has members.view.';

GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_account_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_profile(uuid) TO authenticated;
