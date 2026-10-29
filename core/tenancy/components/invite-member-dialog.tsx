"use client";

import type { MembersForm } from "../members-store";

import { Copy, Plus } from "@gravity-ui/icons";
import {
  Button,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  toast,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { useForm } from "palistor";
import { type FormEvent } from "react";

import { textFieldProps } from "@/core/ui/field-props";
import { Notice } from "@/core/ui/notice";
import { EMAIL_MAX_LENGTH, normalizeEmail } from "@/core/validation/email";

import { assignableRoles, isAccountRole } from "../roles";

import { useAccount } from "./account-provider";

type Invite = MembersForm["invite"];

/** "Invite member" button with the invitation dialog. Render only with members.invite. */
export function InviteMemberDialog({ invite }: { invite: Invite }) {
  const t = useTranslations("Members.invite");

  return (
    // Every opening starts from an empty form.
    <Modal onOpenChange={(isOpen) => isOpen && invite.reset()}>
      <Button size="sm">
        <Plus className="size-4" />
        {t("open")}
      </Button>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            {({ close }) => (
              <InviteDialogContent
                invite={invite}
                onClose={close}
              />
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function InviteDialogContent({ invite, onClose }: { invite: Invite; onClose: () => void }) {
  const form = useForm(invite);

  if (form.link.value) {
    return (
      <InviteLink
        email={normalizeEmail(form.email.value)}
        emailSent={form.emailSent.value}
        path={form.link.value}
        onClose={onClose}
        onInviteAnother={() => form.reset()}
      />
    );
  }

  return (
    <InviteForm
      invite={invite}
      onClose={onClose}
    />
  );
}

function InviteForm({ invite, onClose }: { invite: Invite; onClose: () => void }) {
  const t = useTranslations();
  const { account, role: myRole } = useAccount();
  const form = useForm(invite);
  const roles = assignableRoles(myRole);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void form.submit();
  }

  return (
    <Form
      className="contents"
      validationBehavior="aria"
      onSubmit={handleSubmit}
    >
      <Modal.Header>
        <Modal.Heading>{t("Members.invite.title", { account: account.name })}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        {form.formError.value && <Notice>{form.formError.value}</Notice>}
        <TextField
          autoFocus
          maxLength={EMAIL_MAX_LENGTH}
          type="email"
          {...textFieldProps(form.email)}
        >
          <Label>{t("Common.email")}</Label>
          <Input placeholder={t("Members.invite.emailPlaceholder")} />
          <FieldError>{form.email.errorMessage}</FieldError>
        </TextField>
        <Select
          isInvalid={Boolean(form.role.isInvalid)}
          isRequired={form.role.isRequired}
          value={form.role.value}
          onChange={(key) => isAccountRole(key) && form.role.onValueChange(key)}
        >
          <Label>{t("Members.invite.role")}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <FieldError>{form.role.errorMessage}</FieldError>
          <Select.Popover>
            <ListBox>
              {roles.map((item) => (
                <ListBox.Item
                  key={item}
                  id={item}
                  textValue={t(`Roles.${item}`)}
                >
                  {t(`Roles.${item}`)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="tertiary"
          onPress={onClose}
        >
          {t("Common.cancel")}
        </Button>
        <Button
          isPending={form.submitting}
          type="submit"
        >
          {t("Members.invite.submit")}
        </Button>
      </Modal.Footer>
    </Form>
  );
}

/**
 * The link is shown once: only its hash is stored. It has usually gone out by
 * email already; if sending failed, the inviter passes it on.
 */
function InviteLink({ email, emailSent, path, onClose, onInviteAnother }: {
  email: string;
  emailSent: boolean;
  path: string;
  onClose: () => void;
  onInviteAnother: () => void;
}) {
  const t = useTranslations();
  const link = new URL(path, window.location.origin).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("Members.invite.copied"));
    } catch {
      toast.danger(t("Members.invite.copyFailed"));
    }
  }

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{emailSent ? t("Members.invite.sentTitle") : t("Members.invite.createdTitle")}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        {emailSent
          ? <p className="text-sm text-muted">{t("Members.invite.sent", { email })}</p>
          : <Notice status="warning">{t("Members.invite.created", { email })}</Notice>}
        <TextField
          isReadOnly
          aria-label={t("Members.invite.link")}
          value={link}
        >
          <InputGroup>
            <InputGroup.Input onFocus={(event) => event.currentTarget.select()} />
            <InputGroup.Suffix>
              <Button
                isIconOnly
                aria-label={t("Members.invite.copy")}
                size="sm"
                variant="ghost"
                onPress={copy}
              >
                <Copy className="size-4" />
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
        </TextField>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="tertiary"
          onPress={onInviteAnother}
        >
          {t("Members.invite.another")}
        </Button>
        <Button onPress={onClose}>{t("Common.done")}</Button>
      </Modal.Footer>
    </>
  );
}
