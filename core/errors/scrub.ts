import type { Context, ErrorEvent, ErrorTransport } from "untracker";

// Last step before an event leaves the app: values under secret-looking keys
// and JWTs inside strings are replaced, whatever the call site passed. Both
// the event (beforeSend) and the Error object a transport receives are
// scrubbed: SDKs send the error's own message and stack.

const SECRET_KEY = /passw(or)?d|secret|token|authorization|cookie|api[-_]?key|credential/i;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const MAX_DEPTH = 5;

export const REDACTED = "[redacted]";

const redactString = (value: string) => value.replace(JWT, REDACTED);

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value !== "object" || value === null || value instanceof Date) {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? REDACTED : redact(item, depth + 1)])
  );
}

/** A copy of the error with scrubbed message, stack and own fields (e.g. `digest`, `code`). */
export function scrubError(error: Error): Error {
  const copy = new Error(redactString(error.message));

  Object.assign(copy, redact({ ...error }));
  copy.name = error.name;
  copy.stack = error.stack && redactString(error.stack);

  return copy;
}

/** The transport, handed scrubbed errors. Other methods pass through unchanged. */
export function scrubbingTransport(transport: ErrorTransport): ErrorTransport {
  return Object.assign(Object.create(transport) as ErrorTransport, {
    captureException: (error: Error, event: ErrorEvent) => transport.captureException(scrubError(error), event),
  });
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  return {
    ...event,
    message: redactString(event.message),
    ...(event.stack && { stack: redactString(event.stack) }),
    context: redact(event.context) as Context,
    ...(event.breadcrumbs && { breadcrumbs: redact(event.breadcrumbs) as ErrorEvent["breadcrumbs"] }),
  };
}
