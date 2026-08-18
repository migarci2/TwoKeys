import { FunctionTool, LlmAgent } from "@google/adk";
import { Type } from "@google/genai";

import { EVIDENCE, SCENARIOS } from "../fixture.ts";
import type { EvidenceItem, ScenarioRow } from "../types.ts";

/**
 * The deliberation agent helps one keyholder reach a decision. It is never the
 * agent that proposed the action: it holds no company credentials, cannot
 * execute, cannot create or modify an action version, and has no proposal of
 * its own to defend. See docs/03-system/deliberation.md.
 */

const MODEL_ID = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";

/** Conversation is not evidence, so tool answers carry their source ID. */
function citable(item: EvidenceItem) {
  return {
    factId: item.factId,
    label: item.label,
    value: item.value,
    kind: item.kind,
    source: item.source,
    observedAt: item.observedAt,
  };
}

function matches(item: EvidenceItem, query: string) {
  const haystack = `${item.factId} ${item.label} ${item.value}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2)
    .some((term) => haystack.includes(term));
}

/**
 * Counterevidence is always returned alongside matches. A keyholder asking a
 * narrow question still sees the downside, so the agent cannot present a
 * favourable picture by answering only what it was asked.
 */
export function searchEvidence(query: string) {
  const hits = EVIDENCE.filter((item) => matches(item, query));
  const counter = EVIDENCE.filter(
    (item) => item.kind === "counterevidence" && !hits.includes(item),
  );
  return [...hits, ...counter].map(citable);
}

export function getMetric(factId: string) {
  const item = EVIDENCE.find((entry) => entry.factId === factId);
  if (!item) {
    throw new Error(
      `Unknown factId "${factId}". Known: ${EVIDENCE.map((e) => e.factId).join(", ")}.`,
    );
  }
  return citable(item);
}

/** Every number a keyholder sees comes from here, never from the model. */
export function projectScenario(name: string): ScenarioRow & { factId: string } {
  const row = SCENARIOS.find(
    (entry) => entry.name.toLowerCase() === name.toLowerCase().trim(),
  );
  if (!row) {
    throw new Error(
      `Unknown scenario "${name}". Known: ${SCENARIOS.map((s) => s.name).join(", ")}.`,
    );
  }
  return { ...row, factId: `s.scenario.${row.name.toLowerCase().replace(/\s+/g, "-")}` };
}

const searchEvidenceTool = new FunctionTool({
  name: "search_evidence",
  description:
    "Search the shared evidence set behind this decision. Always returns the relevant counterevidence alongside the matches. Every result carries a factId that must be cited.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "What the keyholder wants to know about." },
    },
    required: ["query"],
  },
  execute: (input) => searchEvidence(String((input as { query?: unknown }).query ?? "")),
});

const getMetricTool = new FunctionTool({
  name: "get_metric",
  description:
    "Read one exact value from the canonical fact model by its factId. Use this instead of restating a number from memory.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      factId: { type: Type.STRING, description: "The factId to read." },
    },
    required: ["factId"],
  },
  execute: (input) => getMetric(String((input as { factId?: unknown }).factId ?? "")),
});

const projectScenarioTool = new FunctionTool({
  name: "project_scenario",
  description:
    "Compute the outcome of a hypothetical variant of this action, such as a reduced budget or a shorter flight. The server computes the numbers. Never calculate them yourself.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      scenario: { type: Type.STRING, description: "The named scenario to project." },
    },
    required: ["scenario"],
  },
  execute: (input) => projectScenario(String((input as { scenario?: unknown }).scenario ?? "")),
});

const INSTRUCTION = `You help one keyholder decide whether to approve a specific business action. You did not propose it and you have no stake in the outcome.

Rules you may never break:
- Cite the factId behind every claim you make. If no tool returns a source for something, say you cannot support it rather than answering.
- Never calculate a number. Call project_scenario or get_metric and report what the server returns.
- Never state or imply that you can approve, execute, or change the action. You cannot. Only the keyholder can, and only through the interface.
- When a keyholder states a condition that is ambiguous or that you cannot map to a concrete change in the action, ask one clarifying question before going further.
- Surface the downside without being asked. The evidence set marks counterevidence explicitly.

The keyholder may be seeing this action for the first time and may not know the proposing agent exists. Establish what is being asked and why it reached them before asking anything of them.`;

export function createDeliberationAgent() {
  return new LlmAgent({
    name: "twokeys_deliberation",
    description:
      "Helps a single keyholder understand and decide one proposed action, grounded in cited evidence.",
    model: MODEL_ID,
    instruction: INSTRUCTION,
    tools: [searchEvidenceTool, getMetricTool, projectScenarioTool],
  });
}
