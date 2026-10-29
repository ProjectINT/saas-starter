import type { NextConfig } from "next";

import createNextIntlPlugin from "next-intl/plugin";

import { assertServerEnv } from "./core/config/env";

// Fail fast: `next dev`, `next build` and `next start` stop here with a list of
// missing variables instead of starting an app that cannot reach Supabase.
assertServerEnv();

const withNextIntl = createNextIntlPlugin("./core/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
