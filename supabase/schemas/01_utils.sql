-- Shared trigger functions. Trigger functions need no EXECUTE grants:
-- privileges are checked when the trigger is created, not when it fires.

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION private.set_updated_at() IS 'BEFORE UPDATE trigger: keeps updated_at current.';
