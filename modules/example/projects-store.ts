import type { ConfigProxy, TranslateFn } from "palistor";

import { toast } from "@heroui/react";
import { Palistor, defineList } from "palistor";

import type { Translate } from "@/core/i18n/translate";
import { captureException } from "@/core/errors";
import { createClient } from "@/core/supabase/client";

// Example module: the projects page. The same pattern as the core stores
// (core/tenancy/members-store.ts): a list loaded under RLS, a form, a row
// action; every write is one statement that RLS checks (public.projects).

export const PROJECT_NAME_MAX_LENGTH = 100;

export const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;

/** What ProjectsView puts into store.context. */
export interface ProjectsContext {
  accountId: string;
  t: Translate;
}

// "details" in the store, `description` in the table: palistor reserves
// `description` as a config key.
export interface ProjectItem {
  id: string;
  name: string;
  details: string;
  createdAt: string;
}

interface CreateValues {
  name: string;
  details: string;
  formError: string;
}

interface RemoveValues {
  targetId: string;
  targetName: string;
  /** The confirmation dialog is open. */
  isOpen: boolean;
}

interface ProjectsStoreApi {
  readonly context: ProjectsContext;
  readonly proxy: { projects: { reload(): void }; create: { reset(): void } };
  setValues(patch: { create?: Partial<CreateValues>; remove?: Partial<RemoveValues> }): void;
}

async function fetchProjects(accountId: string | undefined): Promise<ProjectItem[]> {
  // Empty until ProjectsView sets the context: nothing is fetched during SSR.
  if (!accountId) {
    return [];
  }

  const { data, error } = await createClient()
    .from("projects")
    .select("id, name, description, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    captureException(error, { source: "projects" });
    throw error;
  }

  return data.map((row) => ({ id: row.id, name: row.name, details: row.description, createdAt: row.created_at }));
}

async function createProject(values: CreateValues, store: ProjectsStoreApi) {
  const { accountId, t } = store.context;
  const { error } = await createClient()
    .from("projects")
    .insert({ account_id: accountId, name: values.name.trim(), description: values.details.trim() });

  if (error) {
    captureException(error, { action: "createProject" });
    store.setValues({ create: { formError: t("Projects.createFailed") } });

    return;
  }

  toast.success(t("Projects.created", { name: values.name.trim() }));
  store.proxy.create.reset();
  store.proxy.projects.reload();
}

async function removeProject({ targetId, targetName }: RemoveValues, store: ProjectsStoreApi) {
  const { t } = store.context;
  const { error } = await createClient().from("projects").delete().eq("id", targetId);

  if (error) {
    captureException(error, { action: "removeProject" });
    toast.danger(t("Projects.removeFailed"));

    return;
  }

  toast.success(t("Projects.removed", { name: targetName }));
  store.setValues({ remove: { isOpen: false } });
  store.proxy.projects.reload();
}

const projectsConfig = () => ({
  projects: defineList<ProjectItem>({
    template: {
      id: { value: "" },
      name: { value: "" },
      details: { value: "" },
      createdAt: { value: "" },
    },
    resolve: { resolver: (_values, store) => fetchProjects((store.context as Partial<ProjectsContext>).accountId) },
  }),

  create: {
    name: {
      value: "",
      isRequired: true,
      validate: (value: string, _values: CreateValues, t: TranslateFn) => (value.trim() ? undefined : t("Projects.nameRequired")),
      setter: () => ({ formError: "" }),
    },
    details: { value: "" },
    formError: { value: "" },
    onSubmit: createProject,
  },

  remove: {
    targetId: { value: "" },
    targetName: { value: "" },
    isOpen: { value: false },
    onSubmit: removeProject,
  },
});

/** One store per projects page, created on mount. */
export const createProjectsStore = () => new Palistor({ config: projectsConfig() });

export type ProjectsForm = ConfigProxy<ReturnType<typeof projectsConfig>>;
