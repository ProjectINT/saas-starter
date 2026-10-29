"use client";

import type { AdminAccountItem, AdminAccountsForm } from "../admin-stores";
import type { PalistorRef } from "palistor";

import { Button, Chip } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useForm, useStoreContext } from "palistor";
import { useState } from "react";

import { ConfirmDialog } from "@/core/ui/confirm-dialog";

import { createAdminAccountsStore, goToPage, type AdminContext } from "../admin-stores";

import { AdminListFrame } from "./admin-list-frame";

/** All accounts with search, paging and deactivation. */
export function AdminAccounts() {
  const t = useTranslations();
  const router = useRouter();
  const [store] = useState(createAdminAccountsStore);

  useStoreContext(store, { router, t } satisfies AdminContext);

  const form = useForm(store);
  const query = useForm(form.query);
  const list = useForm(form.items);
  // Every row carries the number of matches of the whole search.
  const total = list.length > 0 ? Number(list.getValues()[0].total) : 0;

  return (
    <>
      <AdminListFrame
        list={list}
        query={query}
        searchPlaceholder={t("Admin.accounts.searchPlaceholder")}
        title={t("Admin.accounts.title")}
        total={total}
        onPage={(page) => goToPage(store, page)}
      >
        {list.map((row, _index, id) => (
          <AccountRow
            key={id}
            action={form.action}
            row={row}
          />
        ))}
      </AdminListFrame>
      <DeactivateDialog action={form.action} />
    </>
  );
}

function AccountRow({ row, action }: { row: PalistorRef<AdminAccountItem>; action: AdminAccountsForm["action"] }) {
  const t = useTranslations("Admin");
  const format = useFormatter();
  const r = useForm(row);
  const a = useForm(action);
  const isActive = r.isActive.value;
  const isPending = a.submitting && a.targetId.value === r.id;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{r.name.value}</span>
        <span className="truncate text-sm text-muted">
          /{r.slug.value} · {t("accounts.owner", { email: r.ownerEmail.value })} · {t("accounts.members", { count: r.memberCount.value })}
        </span>
        <span className="text-xs text-muted">{t("created", { date: format.dateTime(new Date(r.createdAt.value), { dateStyle: "medium" }) })}</span>
      </div>
      <Chip
        color={isActive ? "success" : "danger"}
        size="sm"
        variant="soft"
      >
        {isActive ? t("accounts.active") : t("accounts.deactivated")}
      </Chip>
      <Button
        isPending={isPending}
        size="sm"
        variant={isActive ? "danger-soft" : "secondary"}
        onPress={() => {
          a.setValues({ targetId: r.id, targetName: r.name.value, enable: !isActive, isOpen: isActive });

          // Reactivation needs no confirmation.
          if (!isActive) {
            void a.submit();
          }
        }}
      >
        {isActive ? t("accounts.deactivate") : t("accounts.reactivate")}
      </Button>
    </li>
  );
}

function DeactivateDialog({ action }: { action: AdminAccountsForm["action"] }) {
  const t = useTranslations("Admin");
  const a = useForm(action);

  return (
    <ConfirmDialog
      confirmLabel={t("accounts.deactivate")}
      isOpen={a.isOpen.value}
      isPending={a.submitting}
      title={t("accounts.deactivateTitle", { account: a.targetName.value })}
      onConfirm={() => void a.submit()}
      onOpenChange={(isOpen) => a.setValues({ isOpen })}
    >
      <p className="text-sm text-muted">{t("accounts.deactivateBody")}</p>
    </ConfirmDialog>
  );
}
