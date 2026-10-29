import type { useRouter } from "next/navigation";

import { toast } from "@heroui/react";
import { Palistor } from "palistor";

import { accountPath, routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";

import { rpcErrorMessage } from "./rpc-errors";

// The invitee's answer to one invitation. Both RPCs accept it only from the
// user whose confirmed email the invitation is addressed to.

/** What InvitationResponse puts into store.context. */
export interface InvitationResponseContext {
  invitationId: string;
  router: ReturnType<typeof useRouter>;
}

export type InvitationChoice = "" | "accept" | "decline";

interface ResponseValues {
  choice: InvitationChoice;
}

/** The part of the store respond() uses (palistor hands the store to onSubmit untyped). */
interface ResponseStoreApi {
  readonly context: Record<string, unknown>;
  setValues(patch: { response: Partial<ResponseValues> }): void;
}

/**
 * Sends the answer and leaves the page. The choice stays set after success,
 * so both buttons stay busy until the next page replaces them; a failure
 * clears it for another try.
 */
async function respond({ choice }: ResponseValues, store: ResponseStoreApi) {
  const { invitationId = "", router } = store.context as Partial<InvitationResponseContext>;
  const supabase = createClient();

  if (choice === "accept") {
    const { data, error } = await supabase.rpc("accept_invitation", { p_invitation_id: invitationId });

    if (error) {
      toast.danger(rpcErrorMessage(error));
      store.setValues({ response: { choice: "" } });

      return;
    }

    toast.success(`You joined ${data.name}.`);
    router?.push(accountPath(data.slug));
  } else if (choice === "decline") {
    const { error } = await supabase.rpc("decline_invitation", { p_invitation_id: invitationId });

    if (error) {
      toast.danger(rpcErrorMessage(error));
      store.setValues({ response: { choice: "" } });

      return;
    }

    toast.success("Invitation declined.");
    // The account list shows what is left to choose, or moves on.
    router?.push(routes.accounts);
  }
}

const invitationResponseConfig = () => ({
  response: {
    choice: { value: "" as InvitationChoice },
    onSubmit: respond,
  },
});

/** One store per invitation shown (an invitation page, or a row on /accounts). */
export const createInvitationResponseStore = () => new Palistor({ config: invitationResponseConfig() });
