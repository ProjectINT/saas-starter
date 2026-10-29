import type { Instrumentation } from "next";

// Server side of error reporting (core/errors). Runs once per server instance,
// before the first request.
export async function register() {
  const [{ createAppErrorHandler, installErrorHandler }, { serverErrorTransport }, { nodeEnv, publicEnv }] = await Promise.all([
    import("./core/errors"),
    import("./core/config/monitoring"),
    import("./core/config/public-env"),
  ]);

  installErrorHandler(createAppErrorHandler(await serverErrorTransport(), {
    environment: nodeEnv,
    release: publicEnv.NEXT_PUBLIC_APP_RELEASE,
  }));
}

/** Errors thrown while rendering, in Route Handlers, Server Actions and proxy.ts. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { captureException, flushErrors } = await import("./core/errors");
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;

  // The route pattern, not request.path: paths and query strings carry
  // invitation and email-link tokens.
  captureException(error, {
    digest,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
  await flushErrors(2000);
};
