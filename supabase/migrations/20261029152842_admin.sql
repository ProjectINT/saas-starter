SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.admin_list_accounts (
  p_search text,
  p_limit  integer,
  p_offset integer
)
  RETURNS TABLE (
    id             uuid,
    slug           text,
    name           text,
    owner_email    text,
    member_count   bigint,
    deactivated_at timestamp with time zone,
    created_at     timestamp with time zone,
    total_count    bigint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.admin_list_users (
  p_search text,
  p_limit  integer,
  p_offset integer
)
  RETURNS TABLE (
    id                uuid,
    email             text,
    name              text,
    account_count     bigint,
    is_platform_admin boolean,
    email_confirmed   boolean,
    banned_until      timestamp with time zone,
    last_sign_in_at   timestamp with time zone,
    created_at        timestamp with time zone,
    total_count       bigint
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.admin_matches (
  p_search text,
  VARIADIC p_values text[]
)
  RETURNS boolean
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  SELECT coalesce(btrim(p_search), '') = ''
    OR EXISTS (SELECT 1 FROM unnest(p_values) AS v WHERE strpos(lower(v), lower(btrim(p_search))) > 0);
$function$;

CREATE OR REPLACE FUNCTION private.admin_page_size (
  p_limit integer
)
  RETURNS integer
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  SELECT least(greatest(coalesce(p_limit, 50), 1), 200);
$function$;

CREATE OR REPLACE FUNCTION private.admin_set_account_active (
  p_account_id uuid,
  p_active     boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.require_platform_admin()
  RETURNS void
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.is_platform_admin() THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_accounts (
  p_search text    DEFAULT NULL::text,
  p_limit  integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
  RETURNS TABLE (
    id             uuid,
    slug           text,
    name           text,
    owner_email    text,
    member_count   bigint,
    deactivated_at timestamp with time zone,
    created_at     timestamp with time zone,
    total_count    bigint
  )
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN QUERY SELECT * FROM private.admin_list_accounts(p_search, p_limit, p_offset);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_list_accounts"(text, integer, integer) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_list_users (
  p_search text    DEFAULT NULL::text,
  p_limit  integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
  RETURNS TABLE (
    id                uuid,
    email             text,
    name              text,
    account_count     bigint,
    is_platform_admin boolean,
    email_confirmed   boolean,
    banned_until      timestamp with time zone,
    last_sign_in_at   timestamp with time zone,
    created_at        timestamp with time zone,
    total_count       bigint
  )
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN QUERY SELECT * FROM private.admin_list_users(p_search, p_limit, p_offset);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_list_users"(text, integer, integer) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.admin_set_account_active (
  p_account_id uuid,
  p_active     boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.admin_set_account_active(p_account_id, p_active);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_set_account_active"(uuid, boolean) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.is_platform_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN private.is_platform_admin();
END;
$function$;

REVOKE ALL ON FUNCTION "public"."is_platform_admin"() FROM PUBLIC, "anon";

COMMENT ON FUNCTION "private"."admin_list_accounts"(text, integer, integer) IS 'All accounts, newest first, filtered by name, slug or owner email. Platform admins only.';

COMMENT ON FUNCTION "private"."admin_list_users"(text, integer, integer) IS 'All users, newest first, filtered by email or name. Platform admins only.';

COMMENT ON FUNCTION "private"."admin_set_account_active"(uuid, boolean) IS 'Deactivates or reactivates an account. Platform admins only.';

COMMENT ON FUNCTION "private"."require_platform_admin"() IS 'Raises unless the current user is a platform admin. First statement of every admin RPC.';

COMMENT ON FUNCTION "public"."admin_list_accounts"(text, integer, integer) IS 'Platform admin: accounts, newest first; p_search matches name, slug or owner email; total_count is the number of matches. Errors: not_allowed.';

COMMENT ON FUNCTION "public"."admin_list_users"(text, integer, integer) IS 'Platform admin: users, newest first; p_search matches email or name; banned_until is set while blocked. Errors: not_allowed.';

COMMENT ON FUNCTION "public"."admin_set_account_active"(uuid, boolean) IS 'Platform admin: deactivates (p_active = false) or reactivates an account; its data stays. Errors: not_allowed, account_not_found.';

COMMENT ON FUNCTION "public"."is_platform_admin"() IS 'True if the caller is a platform admin: the /admin layout and admin Server Actions ask it before anything else.';

REVOKE ALL ON FUNCTION "private"."admin_list_accounts"(text, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."admin_list_accounts"(text, integer, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."admin_list_accounts"(text, integer, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."admin_list_accounts"(text, integer, integer) TO "postgres";

REVOKE ALL ON FUNCTION "private"."admin_list_users"(text, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."admin_list_users"(text, integer, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."admin_list_users"(text, integer, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."admin_list_users"(text, integer, integer) TO "postgres";

REVOKE ALL ON FUNCTION "private"."admin_matches"(text, text[]) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."admin_matches"(text, text[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."admin_matches"(text, text[]) TO "postgres";

REVOKE ALL ON FUNCTION "private"."admin_page_size"(integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."admin_page_size"(integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."admin_page_size"(integer) TO "postgres";

REVOKE ALL ON FUNCTION "private"."admin_set_account_active"(uuid, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."admin_set_account_active"(uuid, boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."admin_set_account_active"(uuid, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."admin_set_account_active"(uuid, boolean) TO "postgres";

REVOKE ALL ON FUNCTION "private"."require_platform_admin"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."require_platform_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."require_platform_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_list_accounts"(text, integer, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_list_accounts"(text, integer, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_list_accounts"(text, integer, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_list_accounts"(text, integer, integer) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_list_users"(text, integer, integer) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_list_users"(text, integer, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_list_users"(text, integer, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_list_users"(text, integer, integer) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_set_account_active"(uuid, boolean) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."admin_set_account_active"(uuid, boolean) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_set_account_active"(uuid, boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."admin_set_account_active"(uuid, boolean) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_platform_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."is_platform_admin"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_platform_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_platform_admin"() TO "service_role";
