import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthorityError,
  POLICY_VERSION,
  createInitialDecision,
  currentAction,
  resolveRequiredRoles,
} from "./authority.ts";
import { KEYHOLDER_POLICY } from "./policy.ts";

const LAUNCH = {
  actionType: "google_ads.campaign.activate",
  currencyCode: "EUR",
} as const;

function expectInvalid(run: () => unknown): void {
  assert.throws(
    run,
    (error) => error instanceof AuthorityError && error.code === "INVALID_INPUT",
  );
}

test("P1: resolution is deterministic and reads only material properties", () => {
  const one = resolveRequiredRoles({ ...LAUNCH, budgetCapMicros: "30000000000" });
  const two = resolveRequiredRoles({ ...LAUNCH, budgetCapMicros: "30000000000" });
  assert.deepEqual(one, two);
  assert.deepEqual(one.requiredRoles, ["finance", "ceo"]);
  assert.deepEqual(one.matchedRuleIds, ["launch-budget-at-or-above-eur-25000"]);
  assert.equal(one.policyVersion, POLICY_VERSION);
});

test("P2: EUR 25,000 is the inclusive threshold for Finance and CEO", () => {
  const atThreshold = resolveRequiredRoles({ ...LAUNCH, budgetCapMicros: "25000000000" });
  assert.deepEqual(atThreshold.requiredRoles, ["finance", "ceo"]);

  const below = resolveRequiredRoles({ ...LAUNCH, budgetCapMicros: "24999999999" });
  assert.deepEqual(below.requiredRoles, []);
  assert.deepEqual(below.matchedRuleIds, []);
  assert.equal(below.policyVersion, POLICY_VERSION);
});

test("P3: non-canonical amounts cannot slip under the threshold", () => {
  for (const budgetCapMicros of [
    "3e10",
    "-30000000000",
    "025000000000",
    "24999999999.9",
    " 25000000000",
    "30000000000000000000",
    "",
  ]) {
    expectInvalid(() => resolveRequiredRoles({ ...LAUNCH, budgetCapMicros }));
  }
});

test("P4: an unknown currency or action type fails closed instead of resolving to zero keyholders", () => {
  expectInvalid(() =>
    resolveRequiredRoles({
      actionType: "google_ads.campaign.activate",
      budgetCapMicros: "30000000000",
      currencyCode: "USD",
    }),
  );
  expectInvalid(() =>
    resolveRequiredRoles({
      actionType: "google_ads.campaign.pause",
      budgetCapMicros: "30000000000",
      currencyCode: "EUR",
    }),
  );
});

test("P5: the demo decision's required roles come from the policy fixture", () => {
  const action = currentAction(createInitialDecision("2026-08-14T09:00:00.000Z"));
  const resolution = resolveRequiredRoles({
    actionType: action.actionType,
    budgetCapMicros: action.businessDecision.budgetCapMicros,
    currencyCode: action.businessDecision.currencyCode,
  });
  assert.deepEqual(action.requiredRoles, resolution.requiredRoles);
  assert.equal(action.policyVersion, KEYHOLDER_POLICY.policyVersion);
});
