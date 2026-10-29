// Machine translation for `npm run i18n:translate`, through the OpenAI Chat
// Completions API (plain fetch, no SDK). Only scripts use it; the app never
// calls a translation API.
import type { DictionaryEntry } from "../../messages/dictionary/types.ts";

import { sameShape } from "./lib.ts";

const BATCH_SIZE = 40;
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export interface TranslateOptions {
  apiKey: string;
  model: string;
  /** English name of the target language, e.g. "Russian". */
  language: string;
  fetch?: typeof fetch;
}

export interface TranslateResult {
  translations: Record<string, string>;
  /** Keys the model skipped or answered with wrong arguments or tags. They stay untranslated. */
  failed: string[];
}

const SYSTEM_PROMPT = [
  "You translate the user interface of a web application from English.",
  "Input: a JSON object mapping message keys to { text, tip?, context? }. Output: a JSON object mapping the same keys to the translated text only.",
  "The texts use ICU message syntax. Keep every {argument} name as is and never translate it. Translate the words inside plural branches, and use the plural categories of the target language: {count, plural, one {# file} other {# files}} becomes {count, plural, one {# файл} few {# файла} many {# файлов} other {# файла}} in Russian.",
  "Keep rich-text tags such as <link>...</link> and <strong>...</strong>, translating the words between them.",
  "Use the tip and context to choose wording; do not translate them. Keep the tone short and neutral, close to the original length. No quotes around the result.",
].join("\n");

/** Translates entries in batches. A failed request stops the run; bad answers only fail their keys. */
export async function translateEntries(entries: Map<string, DictionaryEntry>, options: TranslateOptions): Promise<TranslateResult> {
  const keys = [...entries.keys()];
  const result: TranslateResult = { translations: {}, failed: [] };

  for (let start = 0; start < keys.length; start += BATCH_SIZE) {
    const batch = keys.slice(start, start + BATCH_SIZE);
    const input = Object.fromEntries(batch.map((key) => {
      const { word, tip, context } = entries.get(key)!;

      return [key, { text: word, ...(tip && { tip }), ...(context && { context }) }];
    }));
    const answer = await requestBatch(input, options);

    for (const key of batch) {
      const translation = answer[key];
      const source = entries.get(key)!.word;

      if (typeof translation === "string" && translation.trim() !== "" && sameShape(source, translation)) {
        result.translations[key] = translation.trim();
      } else {
        result.failed.push(key);
      }
    }
  }

  return result;
}

async function requestBatch(input: Record<string, unknown>, { apiKey, model, language, fetch: fetchImpl = fetch }: TranslateOptions) {
  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Target language: ${language}.\n\n${JSON.stringify(input, null, 2)}` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }

  const body = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content ?? "{}";

  try {
    const parsed: unknown = JSON.parse(content);

    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
