import assert from "node:assert/strict";
import test from "node:test";

import { MemoryProposalStore } from "./proposal-store.ts";
import { createRevenueAgent, runRevenueAgent } from "./revenue-agent.ts";
import { MemoryDecisionStore } from "./store.ts";

test("the Revenue Agent proposes through the governed seam and cannot self-approve", async () => {
  const proposals = new MemoryProposalStore();
  const result = await runRevenueAgent(
    { decisions: new MemoryDecisionStore(), proposals },
    { useModel: false },
  );

  assert.equal(result.source, "fallback");
  assert.equal(result.decision.state, "PENDING");
  assert.deepEqual(result.decision.requiredRoles, ["finance", "ceo"]);
  assert.ok(await proposals.read(result.decision.decisionId));
});

test("the ADK proposal tool requires the three source-bound evidence facts", () => {
  const agent = createRevenueAgent(async () => ({} as never), () => undefined);
  const tool = agent.tools?.[0] as { _getDeclaration(): unknown };
  const declaration = tool._getDeclaration() as {
    parameters?: { properties?: { evidence?: { required?: string[] } } };
  };
  assert.deepEqual(declaration.parameters?.properties?.evidence?.required, [
    "campaign.status",
    "product.readiness",
    "marketing.availableBudgetMicros",
  ]);
});
