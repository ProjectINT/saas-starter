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
import { useForm } from "palistor";
import { type FormEvent } from "react";

import { textFieldProps } from "@/core/ui/field-props";
import { Notice } from "@/core/ui/notice";
import { EMAIL_MAX_LENGTH, normalizeEmail } from "@/core/validation/email";

import { ROLE_LABELS, assignableRoles, isAccountRole } from "../roles";

import { useAccount } from "./account-provider";

type Invite = MembersForm["invite"];

/** "Invite member" button with the invitation dialog. Render only with members.invite. */
export function InviteMemberDialog({ invite }: { invite: Invite }) {
  return (
    // Every opening starts from an empty form.
    <Modal onOpenChange={(isOpen) => isOpen && invite.reset()}>
      <Button size="sm">
        <Plus className="size-4" />
        Invite member
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
        <Modal.Heading>Invite to {account.name}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        {form.formError.value && <Notice>{form.formError.value}</Notice>}
        <TextField
          autoFocus
          maxLength={EMAIL_MAX_LENGTH}
          type="email"
          {...textFieldProps(form.email)}
        >
          <Label>Email</Label>
          <Input placeholder="colleague@example.com" />
          <FieldError>{form.email.errorMessage}</FieldError>
        </TextField>
        <Select
          isInvalid={Boolean(form.role.isInvalid)}
          isRequired={form.role.isRequired}
          value={form.role.value}
          onChange={(key) => isAccountRole(key) && form.role.onValueChange(key)}
        >
          <Label>Role</Label>
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
                  textValue={ROLE_LABELS[item]}
                >
                  {ROLE_LABELS[item]}
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
          Cancel
        </Button>
        <Button
          isPending={form.submitting}
          type="submit"
        >
          Create invitation
        </Button>
      </Modal.Footer>
    </Form>
  );
}

/**
 * The link is shown once: only its hash is stored. Email delivery comes with
 * the email module; until then the inviter passes the link on.
 */
function InviteLink({ email, path, onClose, onInviteAnother }: {
  email: string;
  path: string;
  onClose: () => void;
  onInviteAnother: () => void;
}) {
  const link = new URL(path, window.location.origin).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied.");
    } catch {
      toast.danger("Could not copy. Select the link and copy it by hand.");
    }
  }

  return (
    <>
      <Modal.Header>
        <Modal.Heading>Invitation created</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Send this link to {email}. It works for 7 days, only for that email address, and is shown only once.
        </p>
        <TextField
          isReadOnly
          aria-label="Invitation link"
          value={link}
        >
          <InputGroup>
            <InputGroup.Input onFocus={(event) => event.currentTarget.select()} />
            <InputGroup.Suffix>
              <Button
                isIconOnly
                aria-label="Copy link"
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
          Invite another
        </Button>
        <Button onPress={onClose}>Done</Button>
      </Modal.Footer>
    </>
  );
}
