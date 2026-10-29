import { describe, expect, it } from "vitest";
import { noopTransport } from "untracker";

import { REDACTED, redact, scrubEvent } from "./scrub";

import { createAppErrorHandler } from "./index";

const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl";

describe("redact", () => {
  it("replaces values under secret-looking keys at any depth", () => {
    expect(redact({ password: "hunter2", user: { accessToken: "abc", name: "Bob" }, headers: { Authorization: "Bearer x" } })).toEqual({
      password: REDACTED,
      user: { accessToken: REDACTED, name: "Bob" },
      headers: { Authorization: REDACTED },
    });
  });

  it("replaces JWTs inside strings", () => {
    expect(redact(`Bearer ${jwt} rejected`)).toBe(`Bearer ${REDACTED} rejected`);
  });

  it("keeps other values and cuts deep nesting", () => {
    expect(redact({ count: 1, ok: true, at: null, list: ["a"] })).toEqual({ count: 1, ok: true, at: null, list: ["a"] });
    expect(redact({ a: { b: { c: { d: { e: { f: 1 } } } } } })).toEqual({ a: { b: { c: { d: { e: "[truncated]" } } } } });
  });
});

describe("scrubEvent", () => {
  it("scrubs the message, stack and context", () => {
    const event = scrubEvent({
      message: `invalid ${jwt}`,
      stack: `Error: invalid ${jwt}\n    at x`,
      level: "error",
      context: { apiKey: "k", action: "save" },
    });

    expect(event.message).toBe(`invalid ${REDACTED}`);
    expect(event.stack).not.toContain(jwt);
    expect(event.context).toEqual({ apiKey: REDACTED, action: "save" });
  });
});

describe("app error handler", () => {
  it("hands transports a scrubbed copy of the error", () => {
    const transport = noopTransport();
    const error = Object.assign(new Error(`bad token ${jwt}`), { digest: "123", session: { refreshToken: "r" } });

    createAppErrorHandler(transport).captureException(error, { password: "p" });

    const [sent] = transport.errors;

    expect(sent).not.toBe(error);
    expect(sent.message).toBe(`bad token ${REDACTED}`);
    expect(sent.stack).not.toContain(jwt);
    expect(sent).toMatchObject({ digest: "123", session: { refreshToken: REDACTED } });
    expect(transport.events[0].message).toBe(`bad token ${REDACTED}`);
    expect(transport.events[0].context).toMatchObject({ password: REDACTED });
    // The caller's error is untouched.
    expect(error.message).toContain(jwt);
  });
});
