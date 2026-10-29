import "server-only";

import { parseEnv, serverEnvSchema, type ServerEnv } from "./env";

export const serverEnv: ServerEnv = parseEnv(serverEnvSchema, process.env);
