import type { Role } from "./authority.ts";

/**
 * Declarative keyholder policy fixture.
 *
 * This file is data, not logic: the kernel's `resolveRequiredRoles` in
 * authority.ts interprets it, so the resolution rule stays inspectable and
 * versioned instead of buried in code. The proposing agent has no input here.
 * Anything outside the closed vocabulary below fails closed in the kernel.
 */

export interface KeyholderRule {
  ruleId: string;
  description: string;
  match: {
    actionType: "google_ads.campaign.activate";
    currencyCode: "EUR";
    /** Inclusive threshold, integer micros as a canonical decimal string. */
    minBudgetCapMicros: string;
  };
  requiredRoles: readonly Role[];
}

export interface KeyholderPolicyFixture {
  schemaVersion: "twokeys.policy.v1";
  policyVersion: "finance-ceo-v1";
  /** Closed vocabulary. An action type not listed here cannot be resolved. */
  actionTypes: readonly ["google_ads.campaign.activate"];
  /** Closed vocabulary. A currency not listed here cannot be resolved. */
  currencyCodes: readonly ["EUR"];
  /**
   * Every matching rule contributes its roles; the required set is their
   * union. An action matched by no rule resolves to zero keyholders and is
   * authorized without a human step.
   */
  rules: readonly KeyholderRule[];
}

export const KEYHOLDER_POLICY: KeyholderPolicyFixture = {
  schemaVersion: "twokeys.policy.v1",
  policyVersion: "finance-ceo-v1",
  actionTypes: ["google_ads.campaign.activate"],
  currencyCodes: ["EUR"],
  rules: [
    {
      ruleId: "launch-budget-at-or-above-eur-25000",
      description:
        "A campaign launch whose total budget is at least EUR 25,000 commits material spend: Finance owns affordability and the CEO owns strategic priority, so both must consent.",
      match: {
        actionType: "google_ads.campaign.activate",
        currencyCode: "EUR",
        minBudgetCapMicros: "25000000000",
      },
      requiredRoles: ["finance", "ceo"],
    },
  ],
};
