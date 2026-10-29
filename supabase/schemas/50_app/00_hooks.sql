-- App hooks: extension points the core calls. This file belongs to the
-- product built on the template; edit it instead of the core schemas (00-49).

-- Called inside create_account(), in the same transaction, after the account
-- and its owner membership exist. Seed per-account data here (default
-- settings, counters, sample records). Raising an error aborts the creation.
CREATE OR REPLACE FUNCTION private.app_on_account_created(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NULL;
END;
$$;
