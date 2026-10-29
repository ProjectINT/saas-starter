import { beforeEach } from "vitest";

import { installTestErrorHandler, reported } from "@/core/errors/testing";

installTestErrorHandler();

beforeEach(() => {
  reported.reset();
});
