"use client";

import type { ProjectItem, ProjectsForm } from "../projects-store";
import type { PalistorRef } from "palistor";

import { TrashBin } from "@gravity-ui/icons";
import { Button, Card, FieldError, Form, Input, Label, Skeleton, TextArea, TextField } from "@heroui/react";
import { useFormatter, useTranslations } from "next-intl";
import { useForm, useStoreContext, useTranslator } from "palistor";
import { useState, type FormEvent } from "react";

import { useAccount } from "@/core/tenancy/components/account-provider";
import { ConfirmDialog } from "@/core/ui/confirm-dialog";
import { textFieldProps } from "@/core/ui/field-props";
import { LoadError } from "@/core/ui/load-error";
import { Notice } from "@/core/ui/notice";

import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH, createProjectsStore, type ProjectsContext } from "../projects-store";

/** The projects page: the list, the create form for projects.manage, deletion with confirmation. */
export function ProjectsView() {
  const t = useTranslations();
  const { account, can } = useAccount();
  const [store] = useState(createProjectsStore);
  const canManage = can("projects.manage");

  useStoreContext(store, { accountId: account.id, t } satisfies ProjectsContext);
  useTranslator(store, t);

  const form = useForm(store);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("Projects.title")}</h1>
        <p className="text-sm text-muted">{t("Projects.description", { account: account.name })}</p>
      </div>
      {canManage && <CreateProject create={form.create} />}
      <ProjectList
        canManage={canManage}
        projects={form.projects}
        remove={form.remove}
      />
      <RemoveDialog remove={form.remove} />
    </>
  );
}

function CreateProject({ create }: { create: ProjectsForm["create"] }) {
  const t = useTranslations("Projects");
  const form = useForm(create);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit();
  }

  return (
    <Card>
      <Card.Content>
        <Form
          className="flex flex-col gap-4"
          validationBehavior="aria"
          onSubmit={handleSubmit}
        >
          {form.formError.value && <Notice>{form.formError.value}</Notice>}
          <TextField
            maxLength={PROJECT_NAME_MAX_LENGTH}
            {...textFieldProps(form.name)}
          >
            <Label>{t("name")}</Label>
            <Input />
            <FieldError>{form.name.errorMessage}</FieldError>
          </TextField>
          <TextField
            maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
            {...textFieldProps(form.details)}
          >
            <Label>{t("descriptionField")}</Label>
            <TextArea rows={2} />
          </TextField>
          <Button
            className="self-start"
            isPending={form.submitting}
            type="submit"
          >
            {t("create")}
          </Button>
        </Form>
      </Card.Content>
    </Card>
  );
}

function ProjectList({ projects, remove, canManage }: { projects: ProjectsForm["projects"]; remove: ProjectsForm["remove"]; canManage: boolean }) {
  const t = useTranslations("Projects");
  const list = useForm(projects);

  if (list.error) {
    return <LoadError onRetry={list.reload}>{t("loadFailed")}</LoadError>;
  }

  if (list.length === 0) {
    return list.loading
      ? <Skeleton className="h-16 w-full rounded-2xl" />
      : <p className="text-sm text-muted">{t("empty")}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface shadow-surface">
      {list.map((project, _index, id) => (
        <ProjectRow
          key={id}
          canManage={canManage}
          project={project}
          remove={remove}
        />
      ))}
    </ul>
  );
}

function ProjectRow({ project, remove, canManage }: { project: PalistorRef<ProjectItem>; remove: ProjectsForm["remove"]; canManage: boolean }) {
  const t = useTranslations("Projects");
  const format = useFormatter();
  const p = useForm(project);
  const r = useForm(remove);

  return (
    <li className="flex items-start gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{p.name.value}</span>
        {p.details.value && <span className="text-sm whitespace-pre-line text-muted">{p.details.value}</span>}
        <span className="text-xs text-muted">{format.dateTime(new Date(p.createdAt.value), { dateStyle: "medium" })}</span>
      </div>
      {canManage && (
        <Button
          isIconOnly
          aria-label={t("remove", { name: p.name.value })}
          size="sm"
          variant="ghost"
          onPress={() => r.setValues({ targetId: p.id, targetName: p.name.value, isOpen: true })}
        >
          <TrashBin className="size-4" />
        </Button>
      )}
    </li>
  );
}

function RemoveDialog({ remove }: { remove: ProjectsForm["remove"] }) {
  const t = useTranslations("Projects");
  const r = useForm(remove);

  return (
    <ConfirmDialog
      confirmLabel={t("removeConfirm")}
      isOpen={r.isOpen.value}
      isPending={r.submitting}
      title={t("removeTitle", { name: r.targetName.value })}
      onConfirm={() => void r.submit()}
      onOpenChange={(isOpen) => r.setValues({ isOpen })}
    >
      <p className="text-sm text-muted">{t("removeBody")}</p>
    </ConfirmDialog>
  );
}
