import assert from "node:assert/strict";
import test from "node:test";

import { createInitialDecision, type Role } from "./authority.ts";
import {
  CEO_CANARY,
  FINANCE_CANARY,
  composeRoleSurface,
  type RoleFeedbackMemory,
  validateModelSurface,
} from "./surface.ts";

const state = createInitialDecision("2026-08-14T09:00:00.000Z");

function memory(role: Role, canary?: string): RoleFeedbackMemory {
  return {
    memoryId: `memory-${role}`,
    ownerRole: role,
    scope: "launch_decisions_above_20000_eur",
    preference: {
      leadWith: "smallest_reversible_pilot",
      include: ["opportunity_cost"],
      deEmphasize: ["top_line_funnel"],
    },
    sourceEpisode: "launch-eu-001",
    confirmedByPrincipal: true,
    createdAt: "2026-08-14T09:01:00.000Z",
    canary,
  };
}

function raw(role: Role, adapted = false): string {
  const ordered = role === "finance"
    ? [
        ["BudgetWaterfall", "/facts/marketing/budgetWaterfall", "Budget impact"],
        ["MetricStrip", "/facts/roleMetrics", "Decision bounds"],
        ["EvidenceList", "/decision/evidence", "Source ledger"],
      ]
    : adapted
      ? [
          ["ScenarioTable", "/facts/strategy/scenarios", "Options and reversibility"],
          ["MetricStrip", "/facts/roleMetrics", "Strategic signal"],
          ["EvidenceList", "/decision/evidence", "Source ledger"],
        ]
      : [
          ["MetricStrip", "/facts/roleMetrics", "Strategic signal"],
          ["ScenarioTable", "/facts/strategy/scenarios", "Options and reversibility"],
          ["EvidenceList", "/decision/evidence", "Source ledger"],
        ];
  return JSON.stringify({
    lead:
      role === "finance"
        ? "Budget impact first with downside visible."
        : adapted
          ? "Smallest reversible pilot and opportunity cost first."
          : "Strategic fit first with alternatives comparable.",
    modules: ordered.map(([component, dataRef, title]) => ({ component, dataRef, title })),
  });
}

test("U1: three Finance and CEO surface pairs retain one shared truth", async () => {
  for (let run = 0; run < 3; run += 1) {
    const [finance, ceo] = await Promise.all([
      composeRoleSurface({
        role: "finance",
        state,
        memories: [],
        memoryDocumentId: "twokeys_role_memory/finance",
        generateText: async () => raw("finance"),
      }),
      composeRoleSurface({
        role: "ceo",
        state,
        memories: [],
        memoryDocumentId: "twokeys_role_memory/ceo",
        generateText: async () => raw("ceo"),
      }),
    ]);
    assert.deepEqual(finance.bindings, ceo.bindings);
    assert.equal(finance.surface.modules[0], "ActionCapsule");
    assert.equal(ceo.surface.modules[0], "ActionCapsule");
    assert.equal(finance.a2ui[0]?.version, "v0.9.1");
  }
});

test("U2: generated numbers, unknown refs, and duplicate modules fail validation", () => {
  assert.throws(
    () => validateModelSurface(raw("finance").replace("Budget impact first", "Budget 30000 first"), "finance"),
    /forbidden content/,
  );
  assert.throws(
    () => validateModelSurface(raw("finance").replace("/facts/roleMetrics", "/private/guess"), "finance"),
    /invalid dataRef/,
  );
  const duplicate = JSON.parse(raw("ceo"));
  duplicate.modules[1] = duplicate.modules[0];
  assert.throws(() => validateModelSurface(JSON.stringify(duplicate), "ceo"), /duplicate or missing/);
});

test("U3: role calls contain only their memory and canaries never render", async () => {
  const prompts: Record<Role, string> = { finance: "", ceo: "" };
  await Promise.all([
    composeRoleSurface({
      role: "finance",
      state,
      memories: [memory("finance", FINANCE_CANARY)],
      memoryDocumentId: "twokeys_role_memory/finance",
      generateText: async ({ prompt }) => ((prompts.finance = prompt), raw("finance")),
    }),
    composeRoleSurface({
      role: "ceo",
      state,
      memories: [memory("ceo", CEO_CANARY)],
      memoryDocumentId: "twokeys_role_memory/ceo",
      generateText: async ({ prompt }) => ((prompts.ceo = prompt), raw("ceo")),
    }),
  ]);
  assert.equal(prompts.finance.includes(FINANCE_CANARY), true);
  assert.equal(prompts.finance.includes(CEO_CANARY), false);
  assert.equal(prompts.ceo.includes(CEO_CANARY), true);
  assert.equal(prompts.ceo.includes(FINANCE_CANARY), false);
  assert.throws(
    () => validateModelSurface(raw("finance").replace("Source ledger", CEO_CANARY), "finance"),
    /forbidden content/,
  );
  await assert.rejects(
    composeRoleSurface({
      role: "finance",
      state,
      memories: [memory("ceo")],
      memoryDocumentId: "twokeys_role_memory/ceo",
      generateText: async () => raw("finance"),
    }),
    /Wrong-role memory/,
  );
});

test("M1: CEO memory changes only the later CEO surface", async () => {
  const generator = async ({ prompt }: { prompt: string }) =>
    raw(prompt.includes('"role":"finance"') ? "finance" : "ceo", prompt.includes("smallest_reversible_pilot"));
  const [ceoOff, ceoOn, financeOff, financeOn] = await Promise.all([
    composeRoleSurface({
      role: "ceo",
      state,
      memories: [],
      memoryDocumentId: null,
      episode: "later",
      generateText: generator,
    }),
    composeRoleSurface({
      role: "ceo",
      state,
      memories: [memory("ceo")],
      memoryDocumentId: "twokeys_role_memory/ceo",
      episode: "later",
      generateText: generator,
    }),
    composeRoleSurface({
      role: "finance",
      state,
      memories: [],
      memoryDocumentId: null,
      episode: "later",
      generateText: generator,
    }),
    composeRoleSurface({
      role: "finance",
      state,
      memories: [],
      memoryDocumentId: null,
      episode: "later",
      generateText: generator,
    }),
  ]);
  assert.notDeepEqual(ceoOff.surface, ceoOn.surface);
  assert.equal(ceoOn.surface.modules[1], "ScenarioTable");
  assert.deepEqual(financeOff.surface, financeOn.surface);
  assert.equal(ceoOff.bindings.evidenceHash, ceoOn.bindings.evidenceHash);
  assert.equal(ceoOff.bindings.policyVersion, ceoOn.bindings.policyVersion);
  assert.equal(ceoOff.inputDocumentIds.some((id) => id.includes("role_memory")), false);
  assert.equal(ceoOn.inputDocumentIds.includes("twokeys_role_memory/ceo"), true);
});
