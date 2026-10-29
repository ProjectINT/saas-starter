import { describe, expect, it } from "vitest";

import {
  clashingNamespaces,
  flattenDictionary,
  flattenMessages,
  messageShape,
  pendingKeys,
  reviewLocale,
  sourceHash,
  unflattenMessages,
} from "./lib";

const dictionary = {
  Auth: {
    title: { word: "Welcome back", tip: "Greeting" },
    sent: { word: "We sent a link to <strong>{email}</strong>." },
  },
  Files: {
    count: { word: "{count, plural, one {# file} other {# files}}" },
  },
};

const entries = flattenDictionary(dictionary);

describe("flattenDictionary", () => {
  it("lists entries by path in dictionary order", () => {
    expect([...entries.keys()]).toEqual(["Auth.title", "Auth.sent", "Files.count"]);
    expect(entries.get("Auth.title")).toEqual({ word: "Welcome back", tip: "Greeting" });
  });

  it("rejects keys next-intl cannot address and empty texts", () => {
    expect(() => flattenDictionary({ "a.b": { word: "x" } })).toThrow(/keys may contain/);
    expect(() => flattenDictionary({ A: { word: " " } })).toThrow(/non-empty/);
  });
});

describe("messages", () => {
  it("round-trips nested message files in the given order", () => {
    const flat = flattenMessages({ Auth: { sent: "b", title: "a" } });

    expect(flat).toEqual({ "Auth.sent": "b", "Auth.title": "a" });
    expect(JSON.stringify(unflattenMessages(flat, entries.keys()))).toBe("{\"Auth\":{\"title\":\"a\",\"sent\":\"b\"}}");
  });

  it("finds namespaces defined twice", () => {
    expect(clashingNamespaces({ Auth: {}, Common: {} }, { Projects: {}, Common: {} })).toEqual(["Common"]);
  });
});

describe("messageShape", () => {
  it("collects argument names and tags, ignoring plural branches", () => {
    expect(messageShape("We sent a link to <strong>{email}</strong>.")).toBe("{email} <strong>");
    expect(messageShape("{count, plural, one {# file} other {# files}}")).toBe("{count}");
    expect(messageShape("{count, plural, one {# файл} few {# файла} many {# файлов} other {# файла}}")).toBe("{count}");
  });
});

describe("reviewLocale", () => {
  const ru = {
    "Auth.title": "С возвращением",
    "Auth.sent": "Мы отправили ссылку на <strong>{email}</strong>.",
    "Files.count": "{count, plural, one {# файл} few {# файла} many {# файлов} other {# файла}}",
  };
  const currentLock = Object.fromEntries([...entries].map(([key, { word }]) => [key, sourceHash(word)]));

  it("keeps current translations", () => {
    const report = reviewLocale(entries, ru, currentLock);

    expect(report.kept).toEqual(ru);
    expect(pendingKeys(report)).toEqual([]);
    expect(report.unlocked).toEqual([]);
  });

  it("locks hand-written translations to the current English text", () => {
    const report = reviewLocale(entries, ru, {});

    expect(report.unlocked).toEqual(["Auth.title", "Auth.sent", "Files.count"]);
    expect(report.lock).toEqual(currentLock);
  });

  it("reports missing, outdated, broken and removed keys", () => {
    const report = reviewLocale(
      entries,
      { "Auth.title": "С возвращением", "Auth.sent": "Мы отправили ссылку на {mail}.", "Old.key": "x" },
      { ...currentLock, "Auth.title": sourceHash("Welcome") },
    );

    expect(report.missing).toEqual(["Files.count"]);
    expect(report.outdated).toEqual(["Auth.title"]);
    expect(report.broken).toEqual(["Auth.sent"]);
    expect(report.stale).toEqual(["Old.key"]);
    expect(report.kept).toEqual({});
    expect(pendingKeys(report)).toEqual(["Files.count", "Auth.title", "Auth.sent"]);
  });
});
