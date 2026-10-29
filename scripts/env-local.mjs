// Writes .env.local from the running local Supabase stack (`npm run db:start`).
// Supabase keys are always rewritten. Email settings (Mailpit, the local send
// email hook secret) are added only when missing, so a provider configured by
// hand stays. Other keys in .env.local are kept.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = ".env.local";
const CONFIG_FILE = "supabase/config.toml";

let status;

try {
  status = JSON.parse(execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" }));
} catch {
  console.error("Local Supabase is not running. Start it with `npm run db:start`.");
  process.exit(1);
}

const values = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: status.SECRET_KEY,
};

const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);

if (missing.length > 0) {
  console.error(`\`supabase status\` did not return: ${missing.join(", ")}`);
  process.exit(1);
}

// Read from config.toml rather than repeated here: the Mailpit SMTP port and
// the local hook secret Auth signs with.
const settings = new Map();
let current = "";

for (const line of readFileSync(CONFIG_FILE, "utf8").split("\n")) {
  const header = line.match(/^\[([^\]]+)\]/);
  const entry = line.match(/^(\w+)\s*=\s*"?([^"]*)"?\s*$/);

  if (header) {
    current = header[1];
  } else if (entry) {
    settings.set(`${current}.${entry[1]}`, entry[2]);
  }
}

const setting = (section, key) => settings.get(`${section}.${key}`);

const defaults = {
  EMAIL_PROVIDER: "smtp",
  EMAIL_FROM: "SaaS Starter <noreply@example.com>",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: setting("local_smtp", "smtp_port"),
  SEND_EMAIL_HOOK_SECRET: setting("auth.hook.send_email", "secrets"),
};

for (const [key, value] of Object.entries(defaults)) {
  if (!value) {
    console.error(`${CONFIG_FILE} does not set what ${key} needs (see [local_smtp] smtp_port, [auth.hook.send_email] secrets).`);
    process.exit(1);
  }
}

const isKey = (line, keys) => keys.some((key) => line.startsWith(`${key}=`));
const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split("\n").filter(Boolean) : [];
const kept = existing.filter((line) => !isKey(line, Object.keys(values)));
const added = Object.entries(defaults).filter(([key]) => !kept.some((line) => isKey(line, [key])));

const lines = [
  ...kept,
  ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
  ...added.map(([key, value]) => `${key}=${value}`),
];

writeFileSync(ENV_FILE, `${lines.join("\n")}\n`);
console.log(`Wrote ${[...Object.keys(values), ...added.map(([key]) => key)].join(", ")} to ${ENV_FILE}`);
