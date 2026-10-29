"use client";

import { ArrowRightFromSquare } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import { useTranslations } from "next-intl";
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
export function SignOutButton({ redirectTo = routes.signIn, variant = "ghost" }: {
  /** Where to land after signing out, e.g. sign-in with a `next` to come back. */
  redirectTo?: string;
  variant?: "ghost" | "secondary";
}) {
  const t = useTranslations();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);

    const { error } = await createClient().auth.signOut({ scope: "local" });

    // On a network error supabase-js keeps the local session, so stay put.
    if (error) {
      toast.danger(authErrorMessage(error, t));
      setIsPending(false);

      return;
    }

    window.location.assign(redirectTo);
  }

  return (
    <Button
      isPending={isPending}
      size="sm"
      variant={variant}
      onPress={signOut}
    >
      <ArrowRightFromSquare className="size-4" />
      {t("Common.signOut")}
    </Button>
  );
}
