import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Testing Library's own auto-cleanup registers itself against a *global*
// afterEach, which requires vitest's `test.globals: true` — this project
// deliberately uses explicit per-file imports instead (see vitest.config.js),
// so cleanup has to be wired up by hand here or every render() after the
// first in a file would pile up in the same jsdom document.
afterEach(() => {
  cleanup();
});
