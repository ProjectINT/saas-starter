// Pure logic of scripts/i18n.ts: flattening dictionaries, comparing them with
// the generated message files and the lock, checking translations. No I/O.
import type { DictionaryEntry, DictionarySection } from "../../messages/dictionary/types.ts";

import { createHash } from "node:crypto";


export type FlatEntries = Map<string, DictionaryEntry>;
export type FlatMessages = Record<string, string>;
/** Per locale: message key -> hash of the English text the translation was made from. */
export type Lock = Record<string, Record<string, string>>;

const isEntry = (value: DictionaryEntry | DictionarySection): value is DictionaryEntry => "word" in value;

/** "Auth.signIn.title" -> entry, in dictionary order. Throws on malformed dictionaries. */
export function flattenDictionary(section: DictionarySection, prefix = "", into: FlatEntries = new Map()): FlatEntries {
  for (const [key, value] of Object.entries(section)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (!/^[A-Za-z0-9_]+$/.test(key)) {
      throw new Error(`${path}: keys may contain only letters, digits and "_"`);
    }

    if (isEntry(value)) {
      if (typeof value.word !== "string" || value.word.trim() === "") {
        throw new Error(`${path}: "word" must be a non-empty string`);
      }

      into.set(path, value);
    } else {
      flattenDictionary(value, path, into);
    }
  }

  return into;
}

/** Namespaces defined both by the core and by the product. */
export function clashingNamespaces(core: object, app: object) {
  return Object.keys(app).filter((name) => Object.hasOwn(core, name));
}

export function flattenMessages(messages: unknown, prefix = "", into: FlatMessages = {}): FlatMessages {
  if (typeof messages !== "object" || messages === null) {
    return into;
  }

  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      into[path] = value;
    } else {
      flattenMessages(value, path, into);
    }
  }

  return into;
}

/** Nested message object with keys in the given order. */
export function unflattenMessages(flat: FlatMessages, order: Iterable<string>) {
  const root: Record<string, unknown> = {};

  for (const path of order) {
    if (!Object.hasOwn(flat, path)) {
      continue;
    }

    const keys = path.split(".");
    let node = root;

    for (const key of keys.slice(0, -1)) {
      node[key] ??= {};
      node = node[key] as Record<string, unknown>;
    }

    node[keys[keys.length - 1]] = flat[path];
  }

  return root;
}

export const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Short hash of an English source text. A different hash means the translation is outdated. */
export const sourceHash = (word: string) => createHash("sha256").update(word).digest("hex").slice(0, 12);

/**
 * The parts of an ICU message a translation must keep: argument names
 * (`{email}`, `{count, plural, ...}`) and rich-text tags (`<link>`). Plural
 * branches may differ between languages, so only names are compared.
 */
export function messageShape(message: string) {
  const args = new Set([...message.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g)].map((match) => match[1]));
  const tags = new Set([...message.matchAll(/<\/?([A-Za-z][A-Za-z0-9]*)>/g)].map((match) => match[1]));

  return [...[...args].sort().map((arg) => `{${arg}}`), ...[...tags].sort().map((tag) => `<${tag}>`)].join(" ");
}

export const sameShape = (source: string, translation: string) => messageShape(source) === messageShape(translation);

export interface LocaleReport {
  /** Translations that are current and stay in the file. */
  kept: FlatMessages;
  /** Lock entries for `kept` (new hand-written translations get the current hash). */
  lock: Record<string, string>;
  missing: string[];
  /** The English text changed since the translation was made. */
  outdated: string[];
  /** Keys no longer in the dictionary (dropped from the file). */
  stale: string[];
  /** Translations that lost or added arguments or tags (dropped from the file). */
  broken: string[];
  /** Hand-written translations that had no lock entry yet. */
  unlocked: string[];
}

/** Compares one locale's messages and lock with the dictionary. */
export function reviewLocale(entries: FlatEntries, messages: FlatMessages, lock: Record<string, string> = {}): LocaleReport {
  const report: LocaleReport = { kept: {}, lock: {}, missing: [], outdated: [], stale: [], broken: [], unlocked: [] };

  for (const [path, { word }] of entries) {
    const translation = messages[path];
    const hash = sourceHash(word);

    if (typeof translation !== "string" || translation.trim() === "") {
      report.missing.push(path);
    } else if (!sameShape(word, translation)) {
      report.broken.push(path);
    } else if (lock[path] !== undefined && lock[path] !== hash) {
      report.outdated.push(path);
    } else {
      if (lock[path] === undefined) {
        report.unlocked.push(path);
      }

      report.kept[path] = translation;
      report.lock[path] = hash;
    }
  }

  report.stale = Object.keys(messages).filter((path) => !entries.has(path));

  return report;
}

/** Everything that needs translating: missing, outdated and broken keys. */
export const pendingKeys = (report: LocaleReport) => [...report.missing, ...report.outdated, ...report.broken];
