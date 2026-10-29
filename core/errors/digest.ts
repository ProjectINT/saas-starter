/**
 * The id Next.js gives a server error before it reaches an error boundary.
 * Such errors were reported on the server (onRequestError); the browser only
 * sees a generic message and this id.
 */
export const errorDigest = (error: unknown) =>
  typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;
