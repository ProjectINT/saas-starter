-- RPCs: invitations.
--
--   admin:   create_invitation(account, email, role) -> token for the link /invite/<token>
--            revoke_invitation(id)
--   invitee: get_invitation(token)  -> details for the invitation page
--            list_my_invitations()  -> pending invitations for the user's email (/accounts)
--            accept_invitation(id) / decline_invitation(id)
--
-- The invitee is matched by confirmed email (auth.users.email_confirmed_at),
-- never by the token alone. Errors carry a stable key as the message:
--   not_authenticated, not_allowed (42501); invitation_not_found (P0002);
--   already_member (23505); invalid_role, invitation_closed,
--   invitation_expired (22023); invitation_limit_reached (PT429, HTTP 429);
--   account_invitations_email_format (23514, check constraint).
--
-- Each invitation sends an email to an address the inviter chose, and anyone
-- can sign up and create an account: the limits in create_invitation keep it
-- from becoming a way to send bulk email.

CREATE OR REPLACE FUNCTION private.invitation_status(p_invitation public.account_invitations)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_invitation.accepted_at IS NOT NULL THEN 'accepted'
    WHEN p_invitation.declined_at IS NOT NULL THEN 'declined'
    WHEN p_invitation.revoked_at IS NOT NULL THEN 'revoked'
    WHEN p_invitation.expires_at <= now() THEN 'expired'
    ELSE 'pending'
  END;
$$;

COMMENT ON FUNCTION private.invitation_status(public.account_invitations) IS 'pending | accepted | declined | revoked | expired.';

-- The current user's email if confirmed, lowercase; NULL otherwise.
CREATE OR REPLACE FUNCTION private.my_confirmed_email()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT lower(u.email)
    FROM auth.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.email_confirmed_at IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION private.my_confirmed_email() IS 'Confirmed email of the current user (lowercase) or NULL. For RPC internals; not granted to clients.';

CREATE OR REPLACE FUNCTION private.display_name(p_profile public.profiles)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(nullif(btrim(concat_ws(' ', p_profile.first_name, p_profile.last_name)), ''), p_profile.email);
$$;

COMMENT ON FUNCTION private.display_name(public.profiles) IS 'First and last name, or the email when both are empty.';

CREATE OR REPLACE FUNCTION private.create_invitation(p_account_id uuid, p_email text, p_role public.account_role)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_my_role public.account_role := private.member_role(p_account_id);
  v_email text := lower(btrim(p_email));
  v_token text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT private.has_permission(p_account_id, 'members.invite') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Invite only to roles not above one's own; ownership is transferred, not invited.
  IF p_role IS NULL OR p_role = 'owner' OR p_role < v_my_role THEN
    RAISE EXCEPTION 'invalid_role' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.account_members m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.account_id = p_account_id
      AND lower(p.email) = v_email
  ) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = 'unique_violation';
  END IF;

  -- Inviting the same email again replaces the open invitation (new link and role).
  UPDATE public.account_invitations
  SET revoked_at = now(), revoked_by = v_user_id
  WHERE account_id = p_account_id
    AND email = v_email
    AND accepted_at IS NULL
    AND declined_at IS NULL
    AND revoked_at IS NULL;

  -- At most 50 pending invitations per account, and 50 sent per inviter a
  -- day across all accounts (re-invites included). Checked after the
  -- replacement above, so re-inviting at the limit still works.
  IF (
    SELECT count(*)
    FROM public.account_invitations i
    WHERE i.account_id = p_account_id
      AND private.invitation_status(i) = 'pending'
  ) >= 50
  OR (
    SELECT count(*)
    FROM public.account_invitations i
    WHERE i.invited_by = v_user_id
      AND i.created_at > now() - interval '1 day'
  ) >= 50 THEN
    RAISE EXCEPTION 'invitation_limit_reached' USING ERRCODE = 'PT429';
  END IF;

  -- 32 random bytes as base64url without padding (43 characters).
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  INSERT INTO public.account_invitations (account_id, email, role, token_hash, invited_by, expires_at)
  VALUES (p_account_id, v_email, p_role, sha256(convert_to(v_token, 'UTF8')), v_user_id, now() + interval '7 days');

  RETURN v_token;
END;
$$;

COMMENT ON FUNCTION private.create_invitation(uuid, text, public.account_role) IS 'Creates an invitation and returns its link token (shown once). Requires members.invite.';

CREATE OR REPLACE FUNCTION public.create_invitation(p_account_id uuid, p_email text, p_role public.account_role)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.create_invitation(p_account_id, p_email, p_role);
END;
$$;

COMMENT ON FUNCTION public.create_invitation(uuid, text, public.account_role) IS
'Invites an email to the account with a role not above the caller''s; replaces an open invitation for the same email. Returns the link token; it is not stored and cannot be read again. Valid for 7 days. At most 50 pending per account and 50 per inviter a day. Errors: not_allowed, invalid_role, already_member, invitation_limit_reached, account_invitations_email_format.';

CREATE OR REPLACE FUNCTION private.revoke_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.account_invitations;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_invitation
  FROM public.account_invitations i
  WHERE i.id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR NOT private.has_permission(v_invitation.account_id, 'members.invite') THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF private.invitation_status(v_invitation) NOT IN ('pending', 'expired') THEN
    RAISE EXCEPTION 'invitation_closed' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.account_invitations
  SET revoked_at = now(), revoked_by = (SELECT auth.uid())
  WHERE id = p_invitation_id;
END;
$$;

COMMENT ON FUNCTION private.revoke_invitation(uuid) IS 'Withdraws an open invitation. Requires members.invite in its account.';

CREATE OR REPLACE FUNCTION public.revoke_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.revoke_invitation(p_invitation_id);
END;
$$;

COMMENT ON FUNCTION public.revoke_invitation(uuid) IS
'Withdraws an open invitation. Errors: invitation_not_found, invitation_closed.';

CREATE OR REPLACE FUNCTION private.get_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  account_name text,
  email text,
  role public.account_role,
  inviter_name text,
  status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT i.id, a.name, i.email, i.role, private.display_name(p), private.invitation_status(i), i.expires_at
  FROM public.account_invitations i
  JOIN public.accounts a ON a.id = i.account_id
  LEFT JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.token_hash = sha256(convert_to(p_token, 'UTF8'))
    AND a.deactivated_at IS NULL;
END;
$$;

COMMENT ON FUNCTION private.get_invitation(text) IS 'Invitation details by link token, for any signed-in user holding the link.';

CREATE OR REPLACE FUNCTION public.get_invitation(p_token text)
RETURNS TABLE (
  id uuid,
  account_name text,
  email text,
  role public.account_role,
  inviter_name text,
  status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY SELECT * FROM private.get_invitation(p_token);
END;
$$;

COMMENT ON FUNCTION public.get_invitation(text) IS
'The invitation behind a link token (no rows if unknown or the account is deactivated). status: pending | accepted | declined | revoked | expired.';

CREATE OR REPLACE FUNCTION private.list_my_invitations()
RETURNS TABLE (
  id uuid,
  account_name text,
  role public.account_role,
  inviter_name text,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, a.name, i.role, private.display_name(p), i.expires_at
  FROM public.account_invitations i
  JOIN public.accounts a ON a.id = i.account_id
  LEFT JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.email = private.my_confirmed_email()
    AND private.invitation_status(i) = 'pending'
    AND a.deactivated_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.account_members m
      WHERE m.account_id = i.account_id
        AND m.user_id = (SELECT auth.uid())
    )
  ORDER BY i.created_at DESC;
END;
$$;

COMMENT ON FUNCTION private.list_my_invitations() IS 'Pending invitations addressed to the current user''s confirmed email.';

CREATE OR REPLACE FUNCTION public.list_my_invitations()
RETURNS TABLE (
  id uuid,
  account_name text,
  role public.account_role,
  inviter_name text,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY SELECT * FROM private.list_my_invitations();
END;
$$;

COMMENT ON FUNCTION public.list_my_invitations() IS
'Pending invitations for the current user''s confirmed email, newest first. Empty while the email is unconfirmed.';

-- Shared by accept and decline: locks and returns an open invitation
-- addressed to the current user, or raises.
CREATE OR REPLACE FUNCTION private.lock_my_invitation(p_invitation_id uuid)
RETURNS public.account_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.account_invitations;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT i.* INTO v_invitation
  FROM public.account_invitations i
  JOIN public.accounts a ON a.id = i.account_id
  WHERE i.id = p_invitation_id
    AND i.email = private.my_confirmed_email()
    AND a.deactivated_at IS NULL
  FOR UPDATE OF i;

  -- Someone else's invitation looks the same as a missing one.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  CASE private.invitation_status(v_invitation)
    WHEN 'pending' THEN
      RETURN v_invitation;
    WHEN 'expired' THEN
      RAISE EXCEPTION 'invitation_expired' USING ERRCODE = 'invalid_parameter_value';
    ELSE
      RAISE EXCEPTION 'invitation_closed' USING ERRCODE = 'invalid_parameter_value';
  END CASE;
END;
$$;

COMMENT ON FUNCTION private.lock_my_invitation(uuid) IS 'Locks a pending invitation addressed to the current user''s confirmed email, or raises. For RPC internals; not granted to clients.';

CREATE OR REPLACE FUNCTION private.accept_invitation(p_invitation_id uuid)
RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.account_invitations := private.lock_my_invitation(p_invitation_id);
  v_account public.accounts;
BEGIN
  -- Already a member (e.g. joined through another invitation): keep the
  -- current role and just close this one.
  INSERT INTO public.account_members (account_id, user_id, role, invited_by)
  VALUES (v_invitation.account_id, (SELECT auth.uid()), v_invitation.role, v_invitation.invited_by)
  ON CONFLICT (account_id, user_id) DO NOTHING;

  UPDATE public.account_invitations
  SET accepted_at = now(), accepted_by = (SELECT auth.uid())
  WHERE id = v_invitation.id;

  SELECT * INTO v_account
  FROM public.accounts a
  WHERE a.id = v_invitation.account_id;

  RETURN v_account;
END;
$$;

COMMENT ON FUNCTION private.accept_invitation(uuid) IS 'Adds the current user to the account with the invited role and closes the invitation.';

CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id uuid)
RETURNS public.accounts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.accept_invitation(p_invitation_id);
END;
$$;

COMMENT ON FUNCTION public.accept_invitation(uuid) IS
'Joins the account of a pending invitation addressed to the caller''s confirmed email; returns the account. Errors: invitation_not_found, invitation_expired, invitation_closed.';

CREATE OR REPLACE FUNCTION private.decline_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invitation public.account_invitations := private.lock_my_invitation(p_invitation_id);
BEGIN
  UPDATE public.account_invitations
  SET declined_at = now()
  WHERE id = v_invitation.id;
END;
$$;

COMMENT ON FUNCTION private.decline_invitation(uuid) IS 'Closes a pending invitation addressed to the current user.';

CREATE OR REPLACE FUNCTION public.decline_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.decline_invitation(p_invitation_id);
END;
$$;

COMMENT ON FUNCTION public.decline_invitation(uuid) IS
'Declines a pending invitation addressed to the caller''s confirmed email. Errors: invitation_not_found, invitation_expired, invitation_closed.';

GRANT EXECUTE ON FUNCTION private.create_invitation(uuid, text, public.account_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invitation(uuid, text, public.account_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.revoke_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.list_my_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION private.accept_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.decline_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_invitation(uuid) TO authenticated;
