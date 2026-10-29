"use client";

import { useEffect } from "react";

import { captureException } from "@/core/errors";
import { errorDigest } from "@/core/errors/digest";

/**
 * Replaces the root layout when the layout itself fails, so it has no
 * messages, providers or global styles. Kept minimal and in English, the
 * source language; every other error page is translated (app/error.tsx).
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = errorDigest(error);

  useEffect(() => {
    if (!digest) {
      captureException(error, { source: "global-error.tsx" });
    }
  }, [error, digest]);

  return (
    <html
      lang="en"
      style={{ colorScheme: "light dark" }}
    >
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <title>Something went wrong</title>
        <main style={{ maxWidth: "28rem", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p>This page could not be shown. Try again; if it keeps happening, come back later.</p>
          {digest && <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Error reference: {digest}</p>}
          <button
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", font: "inherit", cursor: "pointer" }}
            type="button"
            onClick={retry}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
