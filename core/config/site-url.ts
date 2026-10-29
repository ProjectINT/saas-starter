import "server-only";

import { nodeEnv } from "./public-env";
import { serverEnv } from "./server-env";

/**
 * Origin of the app for absolute links in emails, without a trailing slash:
 * SITE_URL, else the Vercel deployment (the production domain in production,
 * the branch URL in previews), else localhost in development.
 */
export function siteUrl() {
  if (serverEnv.SITE_URL) {
    return serverEnv.SITE_URL.replace(/\/+$/, "");
  }

  const vercelHost = serverEnv.VERCEL_ENV === "production"
    ? serverEnv.VERCEL_PROJECT_PRODUCTION_URL
    : serverEnv.VERCEL_BRANCH_URL ?? serverEnv.VERCEL_URL;

  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  if (nodeEnv === "production") {
    // A wrong host in an email link fails silently for the reader: refuse instead.
    throw new Error("SITE_URL is not set");
  }

  return "http://localhost:3000";
}

/** Absolute URL of an app path. */
export const absoluteUrl = (path: string) => `${siteUrl()}${path}`;
