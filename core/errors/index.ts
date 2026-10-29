import {
  consoleTransport,
  createErrorHandler,
  type Context,
  type ErrorHandler,
  type ErrorTransport,
  type Level,
} from "untracker";

import { scrubEvent, scrubbingTransport } from "./scrub";

// Error reporting for the whole app: call captureException / captureMessage
// from anywhere (server or browser). instrumentation.ts and
// instrumentation-client.ts install a handler with the transport from
// core/config/monitoring.*; until then (and in scripts) events go to the console.
//
// The handler lives on globalThis, not in this module: instrumentation and app
// code are separate bundles with their own copies of this file.

const HANDLER = Symbol.for("saas-starter.errorHandler");

type HandlerSlot = { [HANDLER]?: ErrorHandler };

const slot = globalThis as typeof globalThis & HandlerSlot;

/**
 * A handler with the app's settings (secret scrubbing). The release and
 * environment come from the caller, so this module does not load the env
 * contract and works in tests and scripts.
 */
export function createAppErrorHandler(transport: ErrorTransport, { environment, release }: { environment?: string; release?: string } = {}) {
  return createErrorHandler({
    transport: scrubbingTransport(transport),
    environment,
    release,
    beforeSend: scrubEvent,
    // Uncaught errors come through onRequestError and the window listeners in
    // instrumentation-client.ts, the same way for every transport; SDK hooks
    // would report them twice.
    captureUncaught: false,
    captureUnhandledRejections: false,
  });
}

export function installErrorHandler(handler: ErrorHandler) {
  slot[HANDLER] = handler;
}

function errorHandler() {
  slot[HANDLER] ??= createAppErrorHandler(consoleTransport());

  return slot[HANDLER];
}

/** Reports an unexpected error. Expected outcomes (a wrong password, a taken slug) are not errors. */
export const captureException = (error: unknown, context?: Context) => errorHandler().captureException(error, context);

export const captureMessage = (message: string, level?: Level, context?: Context) => errorHandler().captureMessage(message, level, context);

/** Waits until queued events are sent; serverless functions may freeze right after the response. */
export const flushErrors = (timeoutMs?: number) => errorHandler().flush(timeoutMs);
