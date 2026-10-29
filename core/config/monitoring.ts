import { consoleTransport, type ErrorTransport } from "untracker";

/**
 * Where reported errors go (see core/errors). The template writes them to the
 * console: the server log (local terminal, Vercel logs) and the browser
 * console. To use a provider, install its SDK and return its untracker
 * transport, e.g. Rollbar:
 *
 *   npm i rollbar
 *   import { rollbarTransport } from "untracker/rollbar";
 *   return rollbarTransport({ accessToken: runtime === "browser" ? publicEnv.NEXT_PUBLIC_ROLLBAR_TOKEN : ... });
 *
 * or Hawk (`untracker/hawk` with @hawk.so/javascript and @hawk.so/nodejs).
 * This module is part of the browser bundle: read server-only tokens in
 * serverErrorTransport() through a dynamic `import("./server-env")`, and
 * declare every variable in core/config/env.ts.
 */
export function browserErrorTransport(): ErrorTransport {
  return consoleTransport({ prefix: "[error]" });
}

export async function serverErrorTransport(): Promise<ErrorTransport> {
  return consoleTransport({ prefix: "[error]" });
}
