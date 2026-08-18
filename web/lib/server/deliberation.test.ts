import assert from "node:assert/strict";
import test from "node:test";

import { EVIDENCE, SCENARIOS } from "../fixture.ts";
import {
  createDeliberationAgent,
  getMetric,
  projectScenario,
  searchEvidence,
} from "./deliberation.ts";

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
