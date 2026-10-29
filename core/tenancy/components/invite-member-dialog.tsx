"use client";

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
import { startTransition, useActionState, useState, type FormEvent } from "react";

import { Notice } from "@/core/ui/notice";

import { createInvitation } from "../invitation-actions";
import { initialInviteState } from "../invite-state";
import { ROLE_LABELS, assignableRoles, isAccountRole, type AccountRole } from "../roles";

import { useAccount } from "./account-provider";

/** "Invite member" button with the invitation dialog. Render only with members.invite. */
export function InviteMemberDialog() {
  // A new key on every opening resets the form and its action state.
  const [formKey, setFormKey] = useState(0);

  return (
    <Modal onOpenChange={(isOpen) => isOpen && setFormKey((key) => key + 1)}>
      <Button size="sm">
        <Plus className="size-4" />
        Invite member
      </Button>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            {({ close }) => (
              <InviteForm
                key={formKey}
                onClose={close}
                onInviteAnother={() => setFormKey((key) => key + 1)}
              />
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function InviteForm({ onClose, onInviteAnother }: { onClose: () => void; onInviteAnother: () => void }) {
  const { account, role: myRole } = useAccount();
  const roles = assignableRoles(myRole);
  const [state, formAction, isPending] = useActionState(createInvitation.bind(null, account.id), initialInviteState);
  const [email, setEmail] = useState("");
  // The least privileged role by default.
  const [role, setRole] = useState<AccountRole>(roles[roles.length - 1]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(() => formAction(formData));
  }

  if (state.invitePath) {
    return (
      <InviteLink
        email={state.values.email.trim()}
        path={state.invitePath}
        onClose={onClose}
        onInviteAnother={onInviteAnother}
      />
    );
  }

  // A server error stays only while its field holds the submitted value.
  const current: Record<string, string> = { email, role };
  const serverErrors = Object.fromEntries(
    Object.entries(state.errors).filter(([field]) => current[field] === state.values[field])
  );

  return (
    <Form
      className="contents"
      validationErrors={serverErrors}
      onSubmit={handleSubmit}
    >
      <Modal.Header>
        <Modal.Heading>Invite to {account.name}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        {state.formError && <Notice>{state.formError}</Notice>}
        <TextField
          isRequired
          autoFocus
          maxLength={254}
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
        >
          <Label>Email</Label>
          <Input placeholder="colleague@example.com" />
          <FieldError />
        </TextField>
        <Select
          isRequired
          name="role"
          value={role}
          onChange={(key) => isAccountRole(key) && setRole(key)}
        >
          <Label>Role</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <FieldError />
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
          isPending={isPending}
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
