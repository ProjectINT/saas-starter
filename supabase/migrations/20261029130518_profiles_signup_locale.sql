SET local check_function_bodies = off;

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_locale_check";

CREATE OR REPLACE FUNCTION private.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, locale)
  VALUES (
    NEW.id,
    NEW.email,
    left(nullif(btrim(NEW.raw_user_meta_data ->> 'first_name'), ''), 100),
    left(nullif(btrim(NEW.raw_user_meta_data ->> 'last_name'), ''), 100),
    -- The UI language at sign-up; anything the column would reject is dropped.
    CASE
      WHEN char_length(NEW.raw_user_meta_data ->> 'locale') <= 35
        AND NEW.raw_user_meta_data ->> 'locale' ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
      THEN NEW.raw_user_meta_data ->> 'locale'
    END
  );

  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_locale_check" CHECK (((char_length(locale) <= 35) AND (locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'::text)));

COMMENT ON COLUMN "public"."profiles"."locale" IS 'Preferred UI/email language (BCP 47), e.g. en, ru, pt-BR. Set from sign-up metadata, at sign-in and by the language switcher; which tags the app supports is decided in core/i18n/config.ts.';
