-- RPCs of the platform admin area (/admin). Each one starts with
-- private.require_platform_admin(): a tenant permission never opens them.
-- Errors: not_authenticated, not_allowed (42501); account_not_found (P0002).
--
-- Blocking a user is not here: it goes through the Auth admin API (a Server
-- Action that first asks public.is_platform_admin()).

CREATE OR REPLACE FUNCTION private.require_platform_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.is_platform_admin() THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

COMMENT ON FUNCTION private.require_platform_admin() IS 'Raises unless the current user is a platform admin. First statement of every admin RPC.';

-- Page size for the admin lists: 1-200, 50 by default.
CREATE OR REPLACE FUNCTION private.admin_page_size(p_limit integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- Case-insensitive "contains", without LIKE wildcards in the search text.
CREATE OR REPLACE FUNCTION private.admin_matches(p_search text, VARIADIC p_values text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(btrim(p_search), '') = ''
    OR EXISTS (SELECT 1 FROM unnest(p_values) AS v WHERE strpos(lower(v), lower(btrim(p_search))) > 0);
$$;

CREATE OR REPLACE FUNCTION private.admin_list_accounts(p_search text, p_limit integer, p_offset integer)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  owner_email text,
  member_count bigint,
  deactivated_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_platform_admin();

  RETURN QUERY
  SELECT
    a.id,
    a.slug,
    a.name,
    p.email,
    (SELECT count(*) FROM public.account_members m WHERE m.account_id = a.id),
    a.deactivated_at,
    a.created_at,
    count(*) OVER ()
  FROM public.accounts a
  LEFT JOIN public.profiles p ON p.id = a.owner_id
  WHERE private.admin_matches(p_search, a.name, a.slug, p.email)
  ORDER BY a.created_at DESC, a.id
  LIMIT private.admin_page_size(p_limit)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

COMMENT ON FUNCTION private.admin_list_accounts(text, integer, integer) IS 'All accounts, newest first, filtered by name, slug or owner email. Platform admins only.';

CREATE OR REPLACE FUNCTION public.admin_list_accounts(p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  owner_email text,
  member_count bigint,
  deactivated_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY SELECT * FROM private.admin_list_accounts(p_search, p_limit, p_offset);
END;
$$;

COMMENT ON FUNCTION public.admin_list_accounts(text, integer, integer) IS
'Platform admin: accounts, newest first; p_search matches name, slug or owner email; total_count is the number of matches. Errors: not_allowed.';

CREATE OR REPLACE FUNCTION private.admin_set_account_active(p_account_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_platform_admin();

  -- Deactivation keeps the data but closes the account to everyone (every
  -- access helper requires deactivated_at IS NULL).
  UPDATE public.accounts
  SET deactivated_at = CASE WHEN p_active THEN NULL ELSE coalesce(deactivated_at, now()) END
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_not_found' USING ERRCODE = 'no_data_found';
  END IF;
END;
$$;

COMMENT ON FUNCTION private.admin_set_account_active(uuid, boolean) IS 'Deactivates or reactivates an account. Platform admins only.';

CREATE OR REPLACE FUNCTION public.admin_set_account_active(p_account_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.admin_set_account_active(p_account_id, p_active);
END;
$$;

COMMENT ON FUNCTION public.admin_set_account_active(uuid, boolean) IS
'Platform admin: deactivates (p_active = false) or reactivates an account; its data stays. Errors: not_allowed, account_not_found.';

CREATE OR REPLACE FUNCTION private.admin_list_users(p_search text, p_limit integer, p_offset integer)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  account_count bigint,
  is_platform_admin boolean,
  email_confirmed boolean,
  banned_until timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_platform_admin();

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    (SELECT count(*) FROM public.account_members m WHERE m.user_id = u.id),
    EXISTS (SELECT 1 FROM private.platform_admins pa WHERE pa.user_id = u.id),
    u.email_confirmed_at IS NOT NULL,
    u.banned_until,
    u.last_sign_in_at,
    u.created_at,
    count(*) OVER ()
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE private.admin_matches(p_search, u.email, p.first_name, p.last_name)
  ORDER BY u.created_at DESC, u.id
  LIMIT private.admin_page_size(p_limit)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

COMMENT ON FUNCTION private.admin_list_users(text, integer, integer) IS 'All users, newest first, filtered by email or name. Platform admins only.';

CREATE OR REPLACE FUNCTION public.admin_list_users(p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  account_count bigint,
  is_platform_admin boolean,
  email_confirmed boolean,
  banned_until timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY SELECT * FROM private.admin_list_users(p_search, p_limit, p_offset);
END;
$$;

COMMENT ON FUNCTION public.admin_list_users(text, integer, integer) IS
'Platform admin: users, newest first; p_search matches email or name; banned_until is set while blocked. Errors: not_allowed.';

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.is_platform_admin();
END;
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS 'True if the caller is a platform admin: the /admin layout and admin Server Actions ask it before anything else.';

-- The helpers above run only inside these SECURITY DEFINER functions: no grants.
GRANT EXECUTE ON FUNCTION private.admin_list_accounts(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_set_account_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION private.admin_list_users(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
