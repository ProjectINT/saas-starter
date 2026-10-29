// Generates the message files from messages/dictionary (run with Node's
// built-in TypeScript support, see package.json):
//
//   build      writes messages/en.json, drops removed and broken keys from the
//              other locales, records hand-written translations in the lock
//   check      the same without writing; exits 1 if anything is out of date (CI)
//   translate  build, then machine-translates missing and outdated keys
//              (OPENAI_API_KEY, optional OPENAI_MODEL, e.g. in .env.local)
//
// messages/translations.lock.json stores, per key, a hash of the English text
// each translation was made from: editing a `word` marks its translations
// outdated. A failed translation is left missing, never filled with English.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { DEFAULT_LOCALE, LOCALES } from "../core/i18n/config.ts";
import { appDictionary } from "../messages/dictionary/app/index.ts";
import { coreDictionary } from "../messages/dictionary/core/index.ts";
import { dictionary } from "../messages/dictionary/index.ts";

import {
  clashingNamespaces,
  flattenDictionary,
  flattenMessages,
  pendingKeys,
  reviewLocale,
  sourceHash,
  toJson,
  unflattenMessages,
  type Lock,
} from "./i18n/lib.ts";
import { translateEntries } from "./i18n/translate.ts";

const MESSAGES_DIR = new URL("../messages/", import.meta.url);
const LOCK_FILE = new URL("translations.lock.json", MESSAGES_DIR);
const messagesFile = (locale: string) => new URL(`${locale}.json`, MESSAGES_DIR);
const readJson = (file: URL): unknown => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});
const readText = (file: URL) => (existsSync(file) ? readFileSync(file, "utf8") : "");

const command = process.argv[2];

if (command !== "build" && command !== "check" && command !== "translate") {
  console.error("Usage: node scripts/i18n.ts build | check | translate");
  process.exit(2);
}

const clashes = clashingNamespaces(coreDictionary, appDictionary);

if (clashes.length > 0) {
  console.error(`Namespaces defined by both the core and the app dictionary: ${clashes.join(", ")}`);
  process.exit(1);
}

const entries = flattenDictionary(dictionary);
const order = [...entries.keys()];
const englishJson = toJson(unflattenMessages(Object.fromEntries([...entries].map(([key, { word }]) => [key, word])), order));
const lock = readJson(LOCK_FILE) as Lock;
const targets = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const reports = new Map(targets.map((locale) => [locale, reviewLocale(entries, flattenMessages(readJson(messagesFile(locale))), lock[locale])]));
const lockJson = () => toJson(Object.fromEntries(targets.map((locale) => [locale, reports.get(locale)!.lock])));

const list = (keys: string[]) => keys.map((key) => `    ${key}`).join("\n");

function printReport() {
  for (const [locale, report] of reports) {
    const sections = [
      ["missing", report.missing],
      ["outdated (English text changed)", report.outdated],
      ["broken (arguments or tags differ from English)", report.broken],
      ["removed from the dictionary", report.stale],
    ] as const;

    for (const [label, keys] of sections) {
      if (keys.length > 0) {
        console.log(`  ${locale}: ${keys.length} ${label}\n${list(keys)}`);
      }
    }
  }
}

if (command === "check") {
  const problems: string[] = [];

  if (readText(messagesFile(DEFAULT_LOCALE)) !== englishJson) {
    problems.push(`messages/${DEFAULT_LOCALE}.json does not match the dictionary`);
  }

  for (const [locale, report] of reports) {
    if (pendingKeys(report).length > 0 || report.stale.length > 0) {
      problems.push(`messages/${locale}.json is incomplete or out of date`);
    }
  }

  if (readText(LOCK_FILE) !== lockJson()) {
    problems.push("messages/translations.lock.json is out of date");
  }

  if (problems.length > 0) {
    console.error(problems.map((problem) => `✗ ${problem}`).join("\n"));
    printReport();
    console.error("Run `npm run i18n:build` (and `npm run i18n:translate` for missing translations), then commit messages/.");
    process.exit(1);
  }

  console.log(`✓ ${entries.size} messages, ${LOCALES.join(", ")} up to date`);
  process.exit(0);
}

let failedCount = 0;

if (command === "translate") {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set (put it into .env.local).");
    process.exit(1);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

  for (const [locale, report] of reports) {
    const pending = pendingKeys(report);

    if (pending.length === 0) {
      continue;
    }

    console.log(`${locale}: translating ${pending.length} messages with ${model}…`);

    const { translations, failed } = await translateEntries(
      new Map(pending.map((key) => [key, entries.get(key)!])),
      { apiKey, model, language: languageNames.of(locale) ?? locale },
    );

    for (const [key, translation] of Object.entries(translations)) {
      report.kept[key] = translation;
      report.lock[key] = sourceHash(entries.get(key)!.word);
    }

    report.missing = failed;
    report.outdated = [];
    report.broken = [];
    failedCount += failed.length;
  }
}

writeFileSync(messagesFile(DEFAULT_LOCALE), englishJson);

for (const [locale, report] of reports) {
  writeFileSync(messagesFile(locale), toJson(unflattenMessages(report.kept, order)));
}

writeFileSync(LOCK_FILE, lockJson());

console.log(`Wrote messages/${DEFAULT_LOCALE}.json (${entries.size} messages) and ${targets.map((locale) => `${locale}.json`).join(", ")}`);
printReport();

if (failedCount > 0) {
  console.error(`${failedCount} messages were not translated (see "missing" above). Run the command again or translate them by hand.`);
  process.exit(1);
}

if (command === "build" && [...reports.values()].some((report) => pendingKeys(report).length > 0)) {
  console.log("Translate the keys above with `npm run i18n:translate`, or add them to the locale file by hand and run `npm run i18n:build`.");
}
