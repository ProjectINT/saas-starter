-- Invitations to join an account.
--
-- The link in the invitation carries a random token; only its SHA-256 hash is
-- stored. The token only finds the invitation: accepting it requires a
-- confirmed email equal to the invited one, so a forwarded link grants
-- nothing. Rows are written only by the RPCs in 32_invitations.sql and are
-- kept after they close (accepted, declined, revoked) as history.

CREATE TABLE IF NOT EXISTS public.account_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        public.account_role NOT NULL,
  token_hash  bytea NOT NULL,
  invited_by  uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  declined_at timestamptz,
  revoked_at  timestamptz,
  revoked_by  uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT account_invitations_token_hash_key UNIQUE (token_hash),
  CONSTRAINT account_invitations_email_format CHECK (
    char_length(email) <= 254
    AND email = lower(email)
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  -- Ownership changes hands only through transfer_ownership().
  CONSTRAINT account_invitations_role_not_owner CHECK (role <> 'owner'),
  CONSTRAINT account_invitations_closed_once CHECK (num_nonnulls(accepted_at, declined_at, revoked_at) <= 1)
);

COMMENT ON TABLE public.account_invitations IS 'Invitations to join an account. Readable with members.invite; written only by the invitation RPCs.';
COMMENT ON COLUMN public.account_invitations.email IS 'Invited email, lowercase. Only a user with this confirmed email can accept.';
COMMENT ON COLUMN public.account_invitations.token_hash IS 'SHA-256 of the link token. The token itself is returned once by create_invitation() and never stored.';
COMMENT ON COLUMN public.account_invitations.expires_at IS 'After this moment the invitation can no longer be accepted.';

CREATE INDEX IF NOT EXISTS account_invitations_account_id_idx ON public.account_invitations (account_id);
CREATE INDEX IF NOT EXISTS account_invitations_email_idx ON public.account_invitations (email);
CREATE INDEX IF NOT EXISTS account_invitations_invited_by_idx ON public.account_invitations (invited_by);
CREATE INDEX IF NOT EXISTS account_invitations_accepted_by_idx ON public.account_invitations (accepted_by);
CREATE INDEX IF NOT EXISTS account_invitations_revoked_by_idx ON public.account_invitations (revoked_by);
-- One open invitation per email and account: inviting again replaces it.
CREATE UNIQUE INDEX IF NOT EXISTS account_invitations_one_open_idx ON public.account_invitations (account_id, email)
WHERE accepted_at IS NULL AND declined_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- token_hash stays server-side even for admins.
GRANT SELECT (id, account_id, email, role, invited_by, expires_at, accepted_at, declined_at, revoked_at, created_at)
ON public.account_invitations TO authenticated;

CREATE POLICY account_invitations_select ON public.account_invitations
FOR SELECT
TO authenticated
USING (private.has_permission(account_id, 'members.invite'));
