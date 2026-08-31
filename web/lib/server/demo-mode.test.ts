import assert from "node:assert/strict";
import test from "node:test";

import { publicDemoMode } from "./demo-mode.ts";

test("public demo auth is enabled only with the simulated executor", () => {
  assert.equal(publicDemoMode({ TWOKEYS_PUBLIC_DEMO: "true", EXECUTOR_MODE: "simulated" }), true);
  assert.equal(publicDemoMode({ TWOKEYS_PUBLIC_DEMO: "true", EXECUTOR_MODE: "google_ads" }), false);
});
