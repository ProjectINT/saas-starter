SET local check_function_bodies = off;

ALTER TABLE "public"."profiles"
  ADD COLUMN "welcome_email_sent_at" timestamp WITH time zone;

CREATE OR REPLACE FUNCTION private.create_invitation (
  p_account_id uuid,
  p_email      text,
  p_role       public.account_role
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

COMMENT ON COLUMN "public"."profiles"."welcome_email_sent_at" IS 'When the welcome email went out (core/email/welcome.ts); set once by the server.';

COMMENT ON FUNCTION "public"."create_invitation"(uuid, text, public.account_role) IS 'Invites an email to the account with a role not above the caller''s; replaces an open invitation for the same email. Returns the link token; it is not stored and cannot be read again. Valid for 7 days. At most 50 pending per account and 50 per inviter a day. Errors: not_allowed, invalid_role, already_member, invitation_limit_reached, account_invitations_email_format.';
