-- RPC: create an account owned by the current user.
--
-- Pattern for every client-facing RPC:
--   public.<name>  SECURITY INVOKER: the Data API entry point, holds no privileges;
--   private.<name> SECURITY DEFINER: does the privileged writes, derives the
--                  user from auth.uid() and never trusts ids passed by the client.

CREATE OR REPLACE FUNCTION private.create_account(p_name text, p_slug text)
RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

COMMENT ON FUNCTION private.create_account(text, text) IS 'Creates an account and the owner membership for auth.uid(), then calls the app hook.';

CREATE OR REPLACE FUNCTION public.create_account(p_name text, p_slug text)
RETURNS public.accounts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN private.create_account(p_name, p_slug);
END;
$$;

COMMENT ON FUNCTION public.create_account(text, text) IS
'Creates an account owned by the current user. Errors: accounts_slug_key (taken), accounts_slug_format, accounts_slug_not_reserved, name check.';

GRANT EXECUTE ON FUNCTION private.create_account(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_account(text, text) TO authenticated;
