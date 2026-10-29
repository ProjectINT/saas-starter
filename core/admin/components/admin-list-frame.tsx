"use client";

import type { ReactNode } from "react";
import type { FieldProxyNode } from "palistor";

import { Button, Form, Input, Skeleton, TextField } from "@heroui/react";
import { useTranslations } from "next-intl";

import { LoadError } from "@/core/ui/load-error";

import { ADMIN_PAGE_SIZE } from "../admin-stores";

interface QueryForm {
  search: FieldProxyNode<string>;
  page: FieldProxyNode<number>;
  submit(): Promise<unknown>;
}

interface ListState {
  length: number;
  loading: boolean;
  error: unknown;
  reload(): void;
}

/** Search field, result count, pager and the loading/empty/error states around an admin list. */
export function AdminListFrame({ title, searchPlaceholder, query, list, total, onPage, children }: {
  title: string;
  searchPlaceholder: string;
  query: QueryForm;
  list: ListState;
  /** Matches of the whole search (from the rows). */
  total: number;
  onPage: (page: number) => void;
  children: ReactNode;
}) {
  const t = useTranslations("Admin");
  const page = query.page.value;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Form
          className="flex w-full max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void query.submit();
          }}
        >
          <TextField
            aria-label={t("search")}
            className="flex-1"
            type="search"
            value={query.search.value}
            onChange={query.search.onValueChange}
          >
            <Input placeholder={searchPlaceholder} />
          </TextField>
          <Button
            type="submit"
            variant="secondary"
          >
            {t("search")}
          </Button>
        </Form>
      </div>
      {list.error ? (
        <LoadError onRetry={list.reload}>{t("loadFailed")}</LoadError>
      ) : list.length === 0 && list.loading ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-surface">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-2/3 rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">{t("results", { count: 0 })}</p>
      ) : (
        <>
          <p className="text-sm text-muted">{t("results", { count: total })}</p>
          <ul className="flex flex-col divide-y divide-separator rounded-2xl bg-surface shadow-surface">{children}</ul>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <Button
                isDisabled={page === 0 || list.loading}
                size="sm"
                variant="tertiary"
                onPress={() => onPage(page - 1)}
              >
                {t("previous")}
              </Button>
              <span className="text-sm text-muted">{t("page", { page: page + 1, pages })}</span>
              <Button
                isDisabled={page + 1 >= pages || list.loading}
                size="sm"
                variant="tertiary"
                onPress={() => onPage(page + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
