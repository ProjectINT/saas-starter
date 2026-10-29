import { afterEach, describe, expect, it, vi } from "vitest";

import { consoleTransport, resendTransport } from "./transports";

const email = {
  from: "Acme <noreply@acme.test>",
  to: "bob@example.com",
  subject: "Hello",
  html: "<p>Hi</p>",
  text: "Hi https://app.example.com/invite/secret-token",
};

describe("resendTransport", () => {
  it("posts the email to the Resend API", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{\"id\":\"1\"}", { status: 200 }));

    await resendTransport({ apiKey: "re_test", fetch }).send(email);

    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));

    const [, init] = fetch.mock.calls[0];

    expect(init.headers).toMatchObject({ Authorization: "Bearer re_test" });
    expect(JSON.parse(init.body)).toEqual({ from: email.from, to: ["bob@example.com"], subject: "Hello", html: "<p>Hi</p>", text: email.text });
  });

  it("throws with Resend's explanation", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{\"message\":\"The domain is not verified\"}", { status: 403 }));

    await expect(resendTransport({ apiKey: "re_test", fetch }).send(email)).rejects.toThrow(/403.*not verified/);
  });
});

describe("consoleTransport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints the body only when asked to", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await consoleTransport({ includeBody: true }).send(email);
    await consoleTransport({ includeBody: false }).send(email);

    expect(info.mock.calls[0][0]).toContain("secret-token");
    expect(info.mock.calls[1][0]).toBe("[email] to bob@example.com: Hello");
  });
});
