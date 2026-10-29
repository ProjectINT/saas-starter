import { routes } from "@/core/config/routes";

import { isGuestOnlyRoute } from "./public-routes";

const BASE = "http://localhost";

const hasUnsafeCharacters = (value: string) =>
  // Browsers treat "\" as "/" ("/\evil.com" is protocol-relative) and strip
  // tabs/newlines, so neither may appear in a redirect target.
  [...value].some((char) => char === "\\" || char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f);

/**
 * Turns an untrusted `next` value (query string, form field) into a same-origin
 * path to redirect to after authentication. Anything that could leave the site
 * (absolute or protocol-relative URLs) or loop back into sign-in returns the
 * fallback.
 */
export function safeNextPath(value: string | string[] | null | undefined, fallback: string = routes.accounts) {
  const next = Array.isArray(value) ? value[0] : value;

  if (!next || !next.startsWith("/") || next.startsWith("//") || hasUnsafeCharacters(next)) {
    return fallback;
  }

  let url: URL;

  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }

  if (url.origin !== BASE || isGuestOnlyRoute(url.pathname)) {
    return fallback;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Appends `next` to an auth page link unless it is the default destination. */
export function withNext(path: string, next: string) {
  return next === routes.accounts ? path : `${path}?next=${encodeURIComponent(next)}`;
}

/**
 * Absolute URL of the auth callback for OAuth and email links (browser only).
 * Supabase Auth accepts it only if it matches the redirect allow list
 * ([auth] additional_redirect_urls / Dashboard -> Authentication -> URL Configuration).
 */
export function authCallbackUrl(next?: string) {
  const url = new URL(routes.authCallback, window.location.origin);

  if (next) {
    url.searchParams.set("next", next);
  }

  return url.toString();
}
