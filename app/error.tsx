"use client";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { routes } from "@/core/config/routes";
import { captureException } from "@/core/errors";
import { errorDigest } from "@/core/errors/digest";
import { ErrorScreen } from "@/core/ui/error-screen";
import { ButtonLink } from "@/core/ui/links";

/** Errors in any page under the root layout. Errors of the root layout itself go to global-error.tsx. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();
  const digest = errorDigest(error);

  useEffect(() => {
    // Server errors carry a digest and were reported by onRequestError.
    if (!digest) {
      captureException(error, { source: "error.tsx" });
    }
  }, [error, digest]);

  return (
    <ErrorScreen
      description={t("Errors.description")}
      note={digest && t("Errors.reference", { digest })}
      title={t("Errors.title")}
    >
      <Button onPress={retry}>{t("Common.tryAgain")}</Button>
      <ButtonLink
        href={routes.home}
        variant="tertiary"
      >
        {t("Errors.home")}
      </ButtonLink>
    </ErrorScreen>
  );
}
