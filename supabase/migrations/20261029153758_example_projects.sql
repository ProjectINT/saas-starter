CREATE TABLE "public"."projects" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_id"  uuid                     NOT NULL,
  "name"        text                     NOT NULL,
  "description" text                     NOT NULL DEFAULT ''::text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "projects_description_check" CHECK ((char_length(description) <= 1000)),
  CONSTRAINT "projects_name_check" CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 100))),
  CONSTRAINT "projects_pkey" PRIMARY KEY (id),
  "created_by"  uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."projects"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."projects" FROM "anon";

ALTER TABLE "public"."projects"
  ADD CONSTRAINT "projects_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

CREATE INDEX projects_account_id_idx ON public.projects USING btree (account_id, created_at DESC);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE POLICY "projects_delete" ON "public"."projects"
  FOR DELETE
  TO "authenticated"
  USING (private.has_permission(account_id, 'projects.manage'::text));

CREATE POLICY "projects_insert" ON "public"."projects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (private.has_permission(account_id, 'projects.manage'::text));

CREATE POLICY "projects_select" ON "public"."projects"
  FOR SELECT
  TO "authenticated"
  USING (private.has_permission(account_id, 'projects.view'::text));

CREATE POLICY "projects_update" ON "public"."projects"
  FOR UPDATE
  TO "authenticated"
  USING (private.has_permission(account_id, 'projects.manage'::text))
  WITH CHECK (private.has_permission(account_id, 'projects.manage'::text));

COMMENT ON TABLE "public"."projects" IS 'Example module: projects of an account. Read with projects.view, written with projects.manage.';

REVOKE ALL ON TABLE "public"."projects" FROM "authenticated";

REVOKE ALL ("account_id") ON TABLE "public"."projects" FROM "authenticated";

GRANT INSERT ("account_id") ON TABLE "public"."projects" TO "authenticated";

REVOKE ALL ("description") ON TABLE "public"."projects" FROM "authenticated";

GRANT INSERT ("description"), UPDATE ("description") ON TABLE "public"."projects" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."projects" FROM "authenticated";

GRANT INSERT ("name"), UPDATE ("name") ON TABLE "public"."projects" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."projects" TO "authenticated";

REVOKE ALL ON TABLE "public"."projects" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "service_role";

ALTER TABLE "public"."projects"
  ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX projects_created_by_idx ON public.projects USING btree (created_by);

COMMENT ON COLUMN "public"."projects"."created_by" IS 'Set by the database (auth.uid()); clients cannot write it.';
