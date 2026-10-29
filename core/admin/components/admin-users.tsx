"use client";

import type { AdminUserItem, AdminUsersForm } from "../admin-stores";
import type { PalistorRef } from "palistor";

import { Button, Chip } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useForm, useStoreContext } from "palistor";
import { useState } from "react";

import { ConfirmDialog } from "@/core/ui/confirm-dialog";

import { createAdminUsersStore, goToPage, type AdminContext } from "../admin-stores";

import { AdminListFrame } from "./admin-list-frame";

/** All users with search, paging and blocking. `myId`: the signed-in admin, who cannot block themselves. */
export function AdminUsers({ myId }: { myId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [store] = useState(createAdminUsersStore);

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
        searchPlaceholder={t("Admin.users.searchPlaceholder")}
        title={t("Admin.users.title")}
        total={total}
        onPage={(page) => goToPage(store, page)}
      >
        {list.map((row, _index, id) => (
          <UserRow
            key={id}
            action={form.action}
            isMe={id === myId}
            row={row}
          />
        ))}
      </AdminListFrame>
      <BlockDialog action={form.action} />
    </>
  );
}

function UserRow({ row, action, isMe }: { row: PalistorRef<AdminUserItem>; action: AdminUsersForm["action"]; isMe: boolean }) {
  const t = useTranslations("Admin");
  const format = useFormatter();
  const r = useForm(row);
  const a = useForm(action);
  const isBlocked = r.isBlocked.value;
  const isPending = a.submitting && a.targetId.value === r.id;
  const lastSignIn = r.lastSignInAt.value;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{r.name.value || r.email.value}</span>
        <span className="truncate text-sm text-muted">
          {r.name.value ? `${r.email.value} · ` : ""}
          {t("users.accounts", { count: r.accountCount.value })}
        </span>
        <span className="text-xs text-muted">
          {lastSignIn
            ? t("users.lastSignIn", { date: format.dateTime(new Date(lastSignIn), { dateStyle: "medium", timeStyle: "short" }) })
            : t("users.neverSignedIn")}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {r.isPlatformAdmin.value && (
          <Chip
            color="accent"
            size="sm"
            variant="soft"
          >
            {t("users.platformAdmin")}
          </Chip>
        )}
        {!r.isConfirmed.value && (
          <Chip
            color="warning"
            size="sm"
            variant="soft"
          >
            {t("users.unconfirmed")}
          </Chip>
        )}
        {isBlocked && (
          <Chip
            color="danger"
            size="sm"
            variant="soft"
          >
            {t("users.blocked")}
          </Chip>
        )}
      </div>
      {!isMe && (
        <Button
          isPending={isPending}
          size="sm"
          variant={isBlocked ? "secondary" : "danger-soft"}
          onPress={() => {
            a.setValues({ targetId: r.id, targetName: r.email.value, enable: isBlocked, isOpen: !isBlocked });

            // Unblocking needs no confirmation.
            if (isBlocked) {
              void a.submit();
            }
          }}
        >
          {isBlocked ? t("users.unblock") : t("users.block")}
        </Button>
      )}
    </li>
  );
}

function BlockDialog({ action }: { action: AdminUsersForm["action"] }) {
  const t = useTranslations("Admin");
  const a = useForm(action);

  return (
    <ConfirmDialog
      confirmLabel={t("users.block")}
      isOpen={a.isOpen.value}
      isPending={a.submitting}
      title={t("users.blockTitle", { email: a.targetName.value })}
      onConfirm={() => void a.submit()}
      onOpenChange={(isOpen) => a.setValues({ isOpen })}
    >
      <p className="text-sm text-muted">{t("users.blockBody")}</p>
    </ConfirmDialog>
  );
}
