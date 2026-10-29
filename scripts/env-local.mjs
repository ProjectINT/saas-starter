// Writes .env.local from the running local Supabase stack (`npm run db:start`).
// Existing keys in .env.local that are not Supabase keys are kept.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = ".env.local";

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

const kept = existsSync(ENV_FILE)
  ? readFileSync(ENV_FILE, "utf8").split("\n").filter((line) => line && !Object.keys(values).some((key) => line.startsWith(`${key}=`)))
  : [];

const lines = [...kept, ...Object.entries(values).map(([key, value]) => `${key}=${value}`)];

writeFileSync(ENV_FILE, `${lines.join("\n")}\n`);
console.log(`Wrote ${Object.keys(values).join(", ")} to ${ENV_FILE}`);
