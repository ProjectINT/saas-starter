SET local check_function_bodies = off;

CREATE TABLE "public"."account_invitations" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"  uuid                     NOT NULL,
  "email"       text                     NOT NULL,
  "role"        public.account_role      NOT NULL,
  "token_hash"  bytea                    NOT NULL,
  "invited_by"  uuid,
  "expires_at"  timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_by" uuid,
  "declined_at" timestamp with time zone,
  "revoked_at"  timestamp with time zone,
  "revoked_by"  uuid,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "account_invitations_closed_once" CHECK ((num_nonnulls(accepted_at, declined_at, revoked_at) <= 1)),
  CONSTRAINT "account_invitations_email_format" CHECK (((char_length(email) <= 254) AND (email = lower(email)) AND (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))),
  CONSTRAINT "account_invitations_pkey" PRIMARY KEY (id),
  CONSTRAINT "account_invitations_role_not_owner" CHECK ((role <> 'owner'::public.account_role)),
  CONSTRAINT "account_invitations_token_hash_key" UNIQUE (token_hash)
);

ALTER TABLE "public"."account_invitations"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."account_invitations" FROM "anon";

CREATE OR REPLACE FUNCTION private.accept_invitation (
  p_invitation_id uuid
)
  RETURNS public.accounts
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.change_member_role (
  p_account_id uuid,
  p_user_id    uuid,
  p_role       public.account_role
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.create_account (
  p_name text,
  p_slug text
)
  RETURNS public.accounts
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_account public.accounts;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.accounts (name, slug, owner_id)
  VALUES (btrim(p_name), lower(btrim(p_slug)), v_user_id)
  RETURNING * INTO v_account;

  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (v_account.id, v_user_id, 'owner');

  PERFORM private.app_on_account_created(v_account.id);

  RETURN v_account;
END;
$function$;

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

  -- 32 random bytes as base64url without padding (43 characters).
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  INSERT INTO public.account_invitations (account_id, email, role, token_hash, invited_by, expires_at)
  VALUES (p_account_id, v_email, p_role, sha256(convert_to(v_token, 'UTF8')), v_user_id, now() + interval '7 days');

  RETURN v_token;
END;
$function$;

CREATE OR REPLACE FUNCTION private.decline_invitation (
  p_invitation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  v_invitation public.account_invitations := private.lock_my_invitation(p_invitation_id);
BEGIN
  UPDATE public.account_invitations
  SET declined_at = now()
  WHERE id = v_invitation.id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.delete_account (
  p_account_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.display_name (
  p_profile public.profiles
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  SELECT coalesce(nullif(btrim(concat_ws(' ', p_profile.first_name, p_profile.last_name)), ''), p_profile.email);
$function$;

CREATE OR REPLACE FUNCTION private.get_invitation (
  p_token text
)
  RETURNS TABLE (
    id           uuid,
    account_name text,
    email        text,
    role         public.account_role,
    inviter_name text,
    status       text,
    expires_at   timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.invitation_status (
  p_invitation public.account_invitations
)
  RETURNS text
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  SELECT CASE
    WHEN p_invitation.accepted_at IS NOT NULL THEN 'accepted'
    WHEN p_invitation.declined_at IS NOT NULL THEN 'declined'
    WHEN p_invitation.revoked_at IS NOT NULL THEN 'revoked'
    WHEN p_invitation.expires_at <= now() THEN 'expired'
    ELSE 'pending'
  END;
$function$;

CREATE OR REPLACE FUNCTION private.leave_account (
  p_account_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.list_my_invitations()
  RETURNS TABLE (
    id           uuid,
    account_name text,
    role         public.account_role,
    inviter_name text,
    expires_at   timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.lock_my_invitation (
  p_invitation_id uuid
)
  RETURNS public.account_invitations
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.member_role (
  p_account_id uuid
)
  RETURNS public.account_role
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.my_confirmed_email()
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN (
    SELECT lower(u.email)
    FROM auth.users u
    WHERE u.id = (SELECT auth.uid())
      AND u.email_confirmed_at IS NOT NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.remove_member (
  p_account_id uuid,
  p_user_id    uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.revoke_invitation (
  p_invitation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.transfer_ownership (
  p_account_id   uuid,
  p_new_owner_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.accept_invitation (
  p_invitation_id uuid
)
  RETURNS public.accounts
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN private.accept_invitation(p_invitation_id);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."accept_invitation"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.change_member_role (
  p_account_id uuid,
  p_user_id    uuid,
  p_role       public.account_role
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.change_member_role(p_account_id, p_user_id, p_role);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."change_member_role"(uuid, uuid, public.account_role) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.create_invitation (
  p_account_id uuid,
  p_email      text,
  p_role       public.account_role
)
  RETURNS text
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN private.create_invitation(p_account_id, p_email, p_role);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."create_invitation"(uuid, text, public.account_role) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.decline_invitation (
  p_invitation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.decline_invitation(p_invitation_id);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."decline_invitation"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.delete_account (
  p_account_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.delete_account(p_account_id);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."delete_account"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.get_invitation (
  p_token text
)
  RETURNS TABLE (
    id           uuid,
    account_name text,
    email        text,
    role         public.account_role,
    inviter_name text,
    status       text,
    expires_at   timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN QUERY SELECT * FROM private.get_invitation(p_token);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."get_invitation"(text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.leave_account (
  p_account_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.leave_account(p_account_id);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."leave_account"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.list_my_invitations()
  RETURNS TABLE (
    id           uuid,
    account_name text,
    role         public.account_role,
    inviter_name text,
    expires_at   timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
BEGIN
  RETURN QUERY SELECT * FROM private.list_my_invitations();
END;
$function$;

REVOKE ALL ON FUNCTION "public"."list_my_invitations"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.remove_member (
  p_account_id uuid,
  p_user_id    uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.remove_member(p_account_id, p_user_id);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."remove_member"(uuid, uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.revoke_invitation (
  p_invitation_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.revoke_invitation(p_invitation_id);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."revoke_invitation"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.transfer_ownership (
  p_account_id   uuid,
  p_new_owner_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  PERFORM private.transfer_ownership(p_account_id, p_new_owner_id);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."transfer_ownership"(uuid, uuid) FROM PUBLIC, "anon";

ALTER TABLE "public"."account_invitations"
  ADD CONSTRAINT "account_invitations_accepted_by_fkey" FOREIGN KEY (accepted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."account_invitations"
  ADD CONSTRAINT "account_invitations_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

ALTER TABLE "public"."account_invitations"
  ADD CONSTRAINT "account_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."account_invitations"
  ADD CONSTRAINT "account_invitations_revoked_by_fkey" FOREIGN KEY (revoked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX account_invitations_accepted_by_idx ON public.account_invitations USING btree (accepted_by);

CREATE INDEX account_invitations_account_id_idx ON public.account_invitations USING btree (account_id);

CREATE INDEX account_invitations_email_idx ON public.account_invitations USING btree (email);

CREATE INDEX account_invitations_invited_by_idx ON public.account_invitations USING btree (invited_by);

CREATE UNIQUE INDEX account_invitations_one_open_idx ON public.account_invitations USING btree (account_id, email)
  WHERE ((accepted_at IS NULL) AND (declined_at IS NULL) AND (revoked_at IS NULL));

CREATE INDEX account_invitations_revoked_by_idx ON public.account_invitations USING btree (revoked_by);

CREATE POLICY "account_invitations_select" ON "public"."account_invitations"
  FOR SELECT
  TO "authenticated"
  USING (private.has_permission(account_id, 'members.invite'::text));

COMMENT ON COLUMN "public"."account_invitations"."email" IS 'Invited email, lowercase. Only a user with this confirmed email can accept.';

COMMENT ON COLUMN "public"."account_invitations"."expires_at" IS 'After this moment the invitation can no longer be accepted.';

COMMENT ON COLUMN "public"."account_invitations"."token_hash" IS 'SHA-256 of the link token. The token itself is returned once by create_invitation() and never stored.';

COMMENT ON FUNCTION "private"."accept_invitation"(uuid) IS 'Adds the current user to the account with the invited role and closes the invitation.';

COMMENT ON FUNCTION "private"."change_member_role"(uuid, uuid, public.account_role) IS 'Changes a member''s role. Requires members.manage and the rank rule.';

COMMENT ON FUNCTION "private"."create_invitation"(uuid, text, public.account_role) IS 'Creates an invitation and returns its link token (shown once). Requires members.invite.';

COMMENT ON FUNCTION "private"."decline_invitation"(uuid) IS 'Closes a pending invitation addressed to the current user.';

COMMENT ON FUNCTION "private"."delete_account"(uuid) IS 'Deletes the account and, by cascade, its tenant data. Requires account.delete.';

COMMENT ON FUNCTION "private"."display_name"(public.profiles) IS 'First and last name, or the email when both are empty.';

COMMENT ON FUNCTION "private"."get_invitation"(text) IS 'Invitation details by link token, for any signed-in user holding the link.';

COMMENT ON FUNCTION "private"."invitation_status"(public.account_invitations) IS 'pending | accepted | declined | revoked | expired.';

COMMENT ON FUNCTION "private"."leave_account"(uuid) IS 'Removes the current user from the account. The owner must transfer ownership or delete the account instead.';

COMMENT ON FUNCTION "private"."list_my_invitations"() IS 'Pending invitations addressed to the current user''s confirmed email.';

COMMENT ON FUNCTION "private"."lock_my_invitation"(uuid) IS 'Locks a pending invitation addressed to the current user''s confirmed email, or raises. For RPC internals; not granted to clients.';

COMMENT ON FUNCTION "private"."member_role"(uuid) IS 'Role of the current user in the active account, or NULL. For RPC internals; not granted to clients.';

COMMENT ON FUNCTION "private"."my_confirmed_email"() IS 'Confirmed email of the current user (lowercase) or NULL. For RPC internals; not granted to clients.';

COMMENT ON FUNCTION "private"."remove_member"(uuid, uuid) IS 'Removes a member below the caller''s rank. Requires members.manage.';

COMMENT ON FUNCTION "private"."revoke_invitation"(uuid) IS 'Withdraws an open invitation. Requires members.invite in its account.';

COMMENT ON FUNCTION "private"."transfer_ownership"(uuid, uuid) IS 'Makes another member the owner; the previous owner becomes admin. Only the current owner may call it.';

COMMENT ON FUNCTION "public"."accept_invitation"(uuid) IS 'Joins the account of a pending invitation addressed to the caller''s confirmed email; returns the account. Errors: invitation_not_found, invitation_expired, invitation_closed.';

COMMENT ON FUNCTION "public"."change_member_role"(uuid, uuid, public.account_role) IS 'Changes the role of a member below the caller''s rank to a role not above it. Errors: not_allowed, member_not_found, invalid_role (owner: use transfer_ownership).';

COMMENT ON FUNCTION "public"."create_invitation"(uuid, text, public.account_role) IS 'Invites an email to the account with a role not above the caller''s; replaces an open invitation for the same email. Returns the link token; it is not stored and cannot be read again. Valid for 7 days. Errors: not_allowed, invalid_role, already_member, account_invitations_email_format.';

COMMENT ON FUNCTION "public"."decline_invitation"(uuid) IS 'Declines a pending invitation addressed to the caller''s confirmed email. Errors: invitation_not_found, invitation_expired, invitation_closed.';

COMMENT ON FUNCTION "public"."delete_account"(uuid) IS 'Deletes the account permanently. Errors: not_allowed.';

COMMENT ON FUNCTION "public"."get_invitation"(text) IS 'The invitation behind a link token (no rows if unknown or the account is deactivated). status: pending | accepted | declined | revoked | expired.';

COMMENT ON FUNCTION "public"."leave_account"(uuid) IS 'Leaves the account. Errors: member_not_found, owner_cannot_leave.';

COMMENT ON FUNCTION "public"."list_my_invitations"() IS 'Pending invitations for the current user''s confirmed email, newest first. Empty while the email is unconfirmed.';

COMMENT ON FUNCTION "public"."remove_member"(uuid, uuid) IS 'Removes a member below the caller''s rank. Errors: not_allowed, member_not_found.';

COMMENT ON FUNCTION "public"."revoke_invitation"(uuid) IS 'Withdraws an open invitation. Errors: invitation_not_found, invitation_closed.';

COMMENT ON FUNCTION "public"."transfer_ownership"(uuid, uuid) IS 'Hands the account to another member; the caller (owner) becomes admin. Errors: not_allowed, member_not_found.';

COMMENT ON TABLE "public"."account_invitations" IS 'Invitations to join an account. Readable with members.invite; written only by the invitation RPCs.';

REVOKE ALL ON FUNCTION "private"."accept_invitation"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."accept_invitation"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."accept_invitation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."accept_invitation"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."change_member_role"(uuid, uuid, public.account_role) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."change_member_role"(uuid, uuid, public.account_role) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."change_member_role"(uuid, uuid, public.account_role) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."change_member_role"(uuid, uuid, public.account_role) TO "postgres";

REVOKE ALL ON FUNCTION "private"."create_invitation"(uuid, text, public.account_role) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."create_invitation"(uuid, text, public.account_role) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."create_invitation"(uuid, text, public.account_role) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."create_invitation"(uuid, text, public.account_role) TO "postgres";

REVOKE ALL ON FUNCTION "private"."decline_invitation"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."decline_invitation"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."decline_invitation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."decline_invitation"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."delete_account"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."delete_account"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."delete_account"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."delete_account"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."display_name"(public.profiles) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."display_name"(public.profiles) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."display_name"(public.profiles) TO "postgres";

REVOKE ALL ON FUNCTION "private"."get_invitation"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."get_invitation"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."get_invitation"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."get_invitation"(text) TO "postgres";

REVOKE ALL ON FUNCTION "private"."invitation_status"(public.account_invitations) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."invitation_status"(public.account_invitations) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."invitation_status"(public.account_invitations) TO "postgres";

REVOKE ALL ON FUNCTION "private"."leave_account"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."leave_account"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."leave_account"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."leave_account"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."list_my_invitations"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."list_my_invitations"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."list_my_invitations"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."list_my_invitations"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."lock_my_invitation"(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."lock_my_invitation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."lock_my_invitation"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."member_role"(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."member_role"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."member_role"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."my_confirmed_email"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."my_confirmed_email"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."my_confirmed_email"() TO "postgres";

REVOKE ALL ON FUNCTION "private"."remove_member"(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."remove_member"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."remove_member"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."remove_member"(uuid, uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."revoke_invitation"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."revoke_invitation"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."revoke_invitation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."revoke_invitation"(uuid) TO "postgres";

REVOKE ALL ON FUNCTION "private"."transfer_ownership"(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."transfer_ownership"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."transfer_ownership"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."transfer_ownership"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."accept_invitation"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."accept_invitation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."accept_invitation"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."accept_invitation"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."change_member_role"(uuid, uuid, public.account_role) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."change_member_role"(uuid, uuid, public.account_role) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."change_member_role"(uuid, uuid, public.account_role) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."change_member_role"(uuid, uuid, public.account_role) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."create_invitation"(uuid, text, public.account_role) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."create_invitation"(uuid, text, public.account_role) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_invitation"(uuid, text, public.account_role) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_invitation"(uuid, text, public.account_role) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."decline_invitation"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."decline_invitation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."decline_invitation"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."decline_invitation"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_account"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_account"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_account"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_account"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_invitation"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."get_invitation"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_invitation"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_invitation"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."leave_account"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."leave_account"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."leave_account"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."leave_account"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."list_my_invitations"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."list_my_invitations"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."list_my_invitations"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."list_my_invitations"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."remove_member"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."remove_member"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."remove_member"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."remove_member"(uuid, uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."revoke_invitation"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."revoke_invitation"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."revoke_invitation"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."revoke_invitation"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."transfer_ownership"(uuid, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."transfer_ownership"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."transfer_ownership"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."transfer_ownership"(uuid, uuid) TO "service_role";

REVOKE ALL ON TABLE "public"."account_invitations" FROM "authenticated";

REVOKE ALL ("accepted_at") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("accepted_at") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("account_id") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("account_id") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("created_at") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("created_at") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("declined_at") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("declined_at") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("email") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("email") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("expires_at") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("expires_at") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("id") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("invited_by") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("invited_by") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("revoked_at") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("revoked_at") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ("role") ON TABLE "public"."account_invitations" FROM "authenticated";

GRANT SELECT ("role") ON TABLE "public"."account_invitations" TO "authenticated";

REVOKE ALL ON TABLE "public"."account_invitations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."account_invitations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."account_invitations" TO "service_role";
