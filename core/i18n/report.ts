import { IntlErrorCode, type IntlError } from "next-intl";

import { captureException, captureMessage } from "@/core/errors";

// Shared by the server request config and the client provider. English is
// merged under every locale (core/i18n/messages.ts), so a missing message is
// a key that exists in no dictionary: a bug worth reporting, not a gap in a
// translation.

export function reportIntlError(error: IntlError) {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    captureMessage(error.originalMessage ?? error.message, "warning", { code: error.code });
  } else {
    captureException(error, { code: error.code });
  }
}

/** Shows the key ("Members.title") in place of a missing message, so the gap is visible. */
export function messageFallback({ namespace, key }: { namespace?: string; key: string }) {
  return namespace ? `${namespace}.${key}` : key;
}
