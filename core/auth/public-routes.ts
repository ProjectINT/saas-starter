import { routes } from "@/core/config/routes";

/**
 * Reachable without a session. Everything else requires one: proxy.ts sends
 * signed-out visitors to the sign-in page (pages) or answers 401 (/api).
 * Entries match exactly; "/path/*" also matches everything below /path.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  routes.home,
  routes.signIn,
  routes.signUp,
  routes.forgotPassword,
  routes.authCallback,
  routes.authConfirm,
  routes.authError,
  routes.authEmailHook,
  routes.privacyPolicy,
  routes.termsOfUse,
];

/** Pages for signed-out users only: a signed-in user is sent on into the app. */
export const GUEST_ONLY_ROUTES: readonly string[] = [routes.signIn, routes.signUp, routes.forgotPassword];

export const isPublicRoute = (pathname: string) => matchesRoute(pathname, PUBLIC_ROUTES);

export const isGuestOnlyRoute = (pathname: string) => matchesRoute(pathname, GUEST_ONLY_ROUTES);

const BLOCKED = "/__blocked__";

/**
 * Normalizes a pathname before matching. Decodes it so "/%73ign-in" cannot
 * dodge a match, and blocks traversal, protocol-relative and control-character
 * tricks outright.
 */
function normalize(pathname: string) {
  const trimmed = pathname.trim();

  if (!trimmed || /^\/+$/.test(trimmed)) {
    return "/";
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return BLOCKED;
  }

  if (decoded.includes("../") || decoded.includes("/./") || decoded.startsWith("//") || decoded.includes("://")) {
    return BLOCKED;
  }

  if (decoded.includes("\0")) {
    return BLOCKED;
  }

  // Collapse repeated slashes and drop the trailing one.
  return decoded.replace(/\/+/g, "/").replace(/\/+$/, "");
}

/**
 * True if the pathname matches an entry. Matching is exact, so "/sign-in"
 * does not match "/sign-in-evil" or "/sign-in/admin"; add "/path/*" to allow a
 * whole subtree. A bare "/*" matches only the root.
 */
export function matchesRoute(pathname: string, list: readonly string[]) {
  if (!pathname) {
    return false;
  }

  const path = normalize(pathname);

  return list.some((route) => {
    if (!route.endsWith("/*")) {
      return path === normalize(route);
    }

    const base = normalize(route.slice(0, -2));

    if (base === "/") {
      return path === "/";
    }

    return path === base || path.startsWith(`${base}/`);
  });
}
