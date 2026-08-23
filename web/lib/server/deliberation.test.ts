import assert from "node:assert/strict";
import test from "node:test";

import { EVIDENCE, SCENARIOS } from "../fixture.ts";
import {
  createDeliberationAgent,
  getMetric,
  projectScenario,
  runDeliberationTurn,
  searchEvidence,
} from "./deliberation.ts";
import {
  appendDeliberation,
  newTurn,
  readDeliberation,
} from "./deliberation-store.ts";

test("a narrow question still returns the counterevidence", () => {
  const counterIds = EVIDENCE.filter((e) => e.kind === "counterevidence").map((e) => e.factId);
  assert.ok(counterIds.length > 0, "fixture must carry counterevidence to make this meaningful");

  const results = searchEvidence("campaign state").map((r) => r.factId);
  for (const id of counterIds) {
    assert.ok(results.includes(id), `counterevidence ${id} was withheld`);
  }
});

test("every search result carries a citable source", () => {
  for (const result of searchEvidence("readiness")) {
    assert.ok(result.factId.length > 0);
    assert.ok(result.source.length > 0);
    assert.ok(result.observedAt.length > 0);
  }
});

test("an unknown factId fails loudly instead of being answered", () => {
  assert.throws(() => getMetric("f.does.not.exist"), /Unknown factId/);
  const known = EVIDENCE[0];
  assert.equal(getMetric(known.factId).value, known.value);
});

test("scenario projection returns server numbers, never a guess", () => {
  const row = SCENARIOS[0];
  const projected = projectScenario(row.name);
  assert.equal(projected.upsideEur, row.upsideEur);
  assert.equal(projected.downsideEur, row.downsideEur);
  assert.equal(projected.reversible, row.reversible);
  assert.ok(projected.factId.startsWith("s.scenario."));
  assert.throws(() => projectScenario("halve it and hope"), /Unknown scenario/);
});

test("the deliberation agent exposes exactly its three grounded tools", () => {
  const agent = createDeliberationAgent();
  const names = (agent.tools ?? []).map((tool) => (tool as { name: string }).name).sort();
  assert.deepEqual(names, ["get_metric", "project_scenario", "search_evidence"]);
});

test("a vague material condition is clarified before advice is given", async () => {
  const reply = await runDeliberationTurn({
    role: "ceo",
    message: "Approve only if launch readiness is okay.",
    history: [],
    useModel: false,
  });

  assert.match(reply.text, /Do you mean/);
  assert.deepEqual(reply.citations, ["f.product.readiness"]);
  assert.equal(reply.source, "fallback");
});

test("finance receives cited budget evidence and its downside", async () => {
  const reply = await runDeliberationTurn({
    role: "finance",
    message: "Can we afford this budget?",
    history: [],
    useModel: false,
  });

  assert.ok(reply.citations.includes("f.budget.remaining"));
  assert.ok(reply.citations.includes("f.counter.support"));
});

test("private deliberation never crosses roles", async () => {
  const canary = "FIN_ONLY_CANARY_TEST";
  await appendDeliberation("finance", [newTurn("keyholder", canary, "keyholder")]);

  assert.ok((await readDeliberation("finance")).some((turn) => turn.text === canary));
  assert.ok((await readDeliberation("ceo")).every((turn) => turn.text !== canary));
});
