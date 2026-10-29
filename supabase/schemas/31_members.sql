-- RPCs: membership changes inside an account.
--
-- Same pattern as create_account: public.<fn> is the SECURITY INVOKER entry
-- point, private.<fn> the SECURITY DEFINER worker that derives the actor from
-- auth.uid().
--
-- Errors carry a stable key as the message (the UI maps it to text):
--   not_authenticated, not_allowed (42501); member_not_found (P0002);
--   invalid_role, owner_cannot_leave (22023).
--
-- Rank rule (enum order is privilege order, lower = more privileged): a
-- member with members.manage acts only on members strictly below their own
-- role and assigns only roles not above it. The owner role moves only through
-- transfer_ownership().

CREATE OR REPLACE FUNCTION private.change_member_role(p_account_id uuid, p_user_id uuid, p_role public.account_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_my_role public.account_role := private.member_role(p_account_id);
  v_target_role public.account_role;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.has_permission(p_account_id, 'members.manage') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_role IS NULL OR p_role = 'owner' THEN
    RAISE EXCEPTION 'invalid_role' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT m.role INTO v_target_role
  FROM public.account_members m
  WHERE m.account_id = p_account_id
    AND m.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Also rejects changing one's own role (equal rank) and the owner's.
  IF v_target_role <= v_my_role OR p_role < v_my_role THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.account_members
  SET role = p_role
  WHERE account_id = p_account_id
    AND user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION private.change_member_role(uuid, uuid, public.account_role) IS 'Changes a member''s role. Requires members.manage and the rank rule.';

CREATE OR REPLACE FUNCTION public.change_member_role(p_account_id uuid, p_user_id uuid, p_role public.account_role)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.change_member_role(p_account_id, p_user_id, p_role);
END;
$$;

COMMENT ON FUNCTION public.change_member_role(uuid, uuid, public.account_role) IS
'Changes the role of a member below the caller''s rank to a role not above it. Errors: not_allowed, member_not_found, invalid_role (owner: use transfer_ownership).';

CREATE OR REPLACE FUNCTION private.remove_member(p_account_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_my_role public.account_role := private.member_role(p_account_id);
  v_target_role public.account_role;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.has_permission(p_account_id, 'members.manage') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT m.role INTO v_target_role
  FROM public.account_members m
  WHERE m.account_id = p_account_id
    AND m.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Also rejects removing oneself (use leave_account) and the owner.
  IF v_target_role <= v_my_role THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.account_members
  WHERE account_id = p_account_id
    AND user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION private.remove_member(uuid, uuid) IS 'Removes a member below the caller''s rank. Requires members.manage.';

CREATE OR REPLACE FUNCTION public.remove_member(p_account_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.remove_member(p_account_id, p_user_id);
END;
$$;

COMMENT ON FUNCTION public.remove_member(uuid, uuid) IS
'Removes a member below the caller''s rank. Errors: not_allowed, member_not_found.';

CREATE OR REPLACE FUNCTION private.leave_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_my_role public.account_role := private.member_role(p_account_id);
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_my_role IS NULL THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_my_role = 'owner' THEN
    RAISE EXCEPTION 'owner_cannot_leave' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  DELETE FROM public.account_members
  WHERE account_id = p_account_id
    AND user_id = (SELECT auth.uid());
END;
$$;

COMMENT ON FUNCTION private.leave_account(uuid) IS 'Removes the current user from the account. The owner must transfer ownership or delete the account instead.';

CREATE OR REPLACE FUNCTION public.leave_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.leave_account(p_account_id);
END;
$$;

COMMENT ON FUNCTION public.leave_account(uuid) IS
'Leaves the account. Errors: member_not_found, owner_cannot_leave.';

CREATE OR REPLACE FUNCTION private.transfer_ownership(p_account_id uuid, p_new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Locks the account row, so concurrent transfers run one after another.
  PERFORM 1
  FROM public.accounts a
  WHERE a.id = p_account_id
    AND a.owner_id = v_user_id
    AND a.deactivated_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_new_owner_id IS NULL OR p_new_owner_id = v_user_id OR NOT EXISTS (
    SELECT 1
    FROM public.account_members m
    WHERE m.account_id = p_account_id
      AND m.user_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Order matters: check_account_owner() allows the owner role only for
  -- accounts.owner_id, and account_members_one_owner_idx only one owner.
  UPDATE public.accounts
  SET owner_id = p_new_owner_id
  WHERE id = p_account_id;

  UPDATE public.account_members
  SET role = 'admin'
  WHERE account_id = p_account_id
    AND user_id = v_user_id;

  UPDATE public.account_members
  SET role = 'owner'
  WHERE account_id = p_account_id
    AND user_id = p_new_owner_id;
END;
$$;

COMMENT ON FUNCTION private.transfer_ownership(uuid, uuid) IS 'Makes another member the owner; the previous owner becomes admin. Only the current owner may call it.';

CREATE OR REPLACE FUNCTION public.transfer_ownership(p_account_id uuid, p_new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.transfer_ownership(p_account_id, p_new_owner_id);
END;
$$;

COMMENT ON FUNCTION public.transfer_ownership(uuid, uuid) IS
'Hands the account to another member; the caller (owner) becomes admin. Errors: not_allowed, member_not_found.';

CREATE OR REPLACE FUNCTION private.delete_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.has_permission(p_account_id, 'account.delete') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Memberships, invitations and every tenant row with ON DELETE CASCADE go too.
  DELETE FROM public.accounts
  WHERE id = p_account_id;
END;
$$;

COMMENT ON FUNCTION private.delete_account(uuid) IS 'Deletes the account and, by cascade, its tenant data. Requires account.delete.';

CREATE OR REPLACE FUNCTION public.delete_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.delete_account(p_account_id);
END;
$$;

COMMENT ON FUNCTION public.delete_account(uuid) IS
'Deletes the account permanently. Errors: not_allowed.';

GRANT EXECUTE ON FUNCTION private.change_member_role(uuid, uuid, public.account_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_member_role(uuid, uuid, public.account_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.leave_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.transfer_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.delete_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account(uuid) TO authenticated;
