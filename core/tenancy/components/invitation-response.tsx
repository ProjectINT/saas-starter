"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useStoreContext } from "palistor";
import { useState } from "react";

import { createInvitationResponseStore, type InvitationResponseContext } from "../invitation-response-store";

/** Accept / Decline for the invitee. Both navigate on success. */
export function InvitationResponse({ invitationId, fullWidth }: { invitationId: string; fullWidth?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [store] = useState(createInvitationResponseStore);

  useStoreContext(store, { invitationId, router, t } satisfies InvitationResponseContext);

  const { response } = useForm(store);
  const choice = response.choice.value;

  function respond(next: "accept" | "decline") {
    response.setValues({ choice: next });
    void response.submit();
  }

  return (
    <div className="flex gap-2">
      <Button
        fullWidth={fullWidth}
        isDisabled={choice !== ""}
        isPending={choice === "accept"}
        size={fullWidth ? "md" : "sm"}
        onPress={() => respond("accept")}
      >
        {t("Invitations.accept")}
      </Button>
      <Button
        fullWidth={fullWidth}
        isDisabled={choice !== ""}
        isPending={choice === "decline"}
        size={fullWidth ? "md" : "sm"}
        variant="tertiary"
        onPress={() => respond("decline")}
      >
        {t("Invitations.decline")}
      </Button>
    </div>
  );
}
