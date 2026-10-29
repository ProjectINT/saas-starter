import { describe, expect, it, vi } from "vitest";

import { translateEntries } from "./translate";

const entries = new Map([
  ["Auth.title", { word: "Welcome back" }],
  ["Auth.sent", { word: "We sent a link to <strong>{email}</strong>." }],
  ["Auth.or", { word: "or" }],
]);

const answer = (content: unknown) =>
  vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] })));

const options = { apiKey: "sk-test", model: "test-model", language: "Russian" };

describe("translateEntries", () => {
  it("keeps answers with the same arguments and tags, fails the rest", async () => {
    const fetch = answer({
      "Auth.title": " С возвращением ",
      "Auth.sent": "Мы отправили ссылку на {адрес}.",
    });

    const result = await translateEntries(entries, { ...options, fetch });

    expect(result.translations).toEqual({ "Auth.title": "С возвращением" });
    expect(result.failed).toEqual(["Auth.sent", "Auth.or"]);
  });

  it("sends the texts with their notes and the target language", async () => {
    const fetch = answer({});

    await translateEntries(new Map([["A.b", { word: "Leave", tip: "Leave the account" }]]), { ...options, fetch });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));

    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers).toMatchObject({ Authorization: "Bearer sk-test" });
    expect(body.model).toBe("test-model");
    expect(body.messages[1].content).toContain("Target language: Russian.");
    expect(body.messages[1].content).toContain("\"tip\": \"Leave the account\"");
  });

  it("stops on an API error instead of writing English", async () => {
    const fetch = vi.fn(async () => new Response("quota exceeded", { status: 429 }));

    await expect(translateEntries(entries, { ...options, fetch })).rejects.toThrow(/429/);
  });
});
