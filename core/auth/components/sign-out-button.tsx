"use client";

import { ArrowRightFromSquare } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import { useState } from "react";

import { authErrorMessage } from "@/core/auth/errors";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/client";

/**
 * Ends the session on this device and reloads into the sign-in page. The full
 * page load drops everything held in memory (router cache, stores, the
 * Supabase client). Persistent client caches (IndexedDB, localStorage) must be
 * cleared here before the reload once they exist.
 */
export function SignOutButton() {
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);

    const { error } = await createClient().auth.signOut({ scope: "local" });

    // On a network error supabase-js keeps the local session, so stay put.
    if (error) {
      toast.danger(authErrorMessage(error));
      setIsPending(false);

      return;
    }

    window.location.assign(routes.signIn);
  }

  return (
    <Button
      isPending={isPending}
      size="sm"
      variant="ghost"
      onPress={signOut}
    >
      <ArrowRightFromSquare className="size-4" />
      Sign out
    </Button>
  );
}
