import { noopTransport } from "untracker";

import { createAppErrorHandler, installErrorHandler } from "./index";

/**
 * Records reported errors instead of logging them; installed for every test
 * by vitest.setup.ts and reset before each one. Assert with
 * `expect(reported.events).toHaveLength(1)`.
 */
export const reported = noopTransport();

export function installTestErrorHandler() {
  installErrorHandler(createAppErrorHandler(reported));
}
