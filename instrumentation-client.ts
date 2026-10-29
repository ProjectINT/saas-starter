import { browserErrorTransport } from "@/core/config/monitoring";
import { nodeEnv, publicEnv } from "@/core/config/public-env";
import { captureException, createAppErrorHandler, installErrorHandler } from "@/core/errors";

// Browser side of error reporting (core/errors). Runs before the app hydrates,
// so errors from the first render on are reported.
installErrorHandler(createAppErrorHandler(browserErrorTransport(), {
  environment: nodeEnv,
  release: publicEnv.NEXT_PUBLIC_APP_RELEASE,
}));

window.addEventListener("error", (event) => {
  captureException(event.error ?? event.message, { source: "window.error" });
});

window.addEventListener("unhandledrejection", (event) => {
  captureException(event.reason, { source: "unhandledrejection" });
});
