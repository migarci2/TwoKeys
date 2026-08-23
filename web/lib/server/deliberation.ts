import {
  FunctionTool,
  InMemorySessionService,
  isFinalResponse,
  LlmAgent,
  Runner,
  stringifyContent,
} from "@google/adk";
import { Type } from "@google/genai";

import { EVIDENCE, SCENARIOS } from "../fixture.ts";
import type { EvidenceItem, ScenarioRow } from "../types.ts";
import type { Role } from "./authority.ts";
import type { DeliberationTurn } from "./deliberation-store.ts";

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

export function createDeliberationAgent(role?: Role) {
  return new LlmAgent({
    name: "twokeys_deliberation",
    description:
      "Helps a single keyholder understand and decide one proposed action, grounded in cited evidence.",
    model: MODEL_ID,
    instruction:
      INSTRUCTION +
      (role
        ? `\n\nThe authenticated keyholder is ${role.toUpperCase()}. Address only that role's responsibilities and never infer or reveal another role's private conversation.`
        : ""),
    tools: [searchEvidenceTool, getMetricTool, projectScenarioTool],
  });
}

export interface DeliberationReply {
  text: string;
  citations: string[];
  source: "adk" | "fallback";
}

const KNOWN_CITATIONS = [
  ...EVIDENCE.map((item) => item.factId),
  ...SCENARIOS.map((row) => `s.scenario.${row.name.toLowerCase().replace(/\s+/g, "-")}`),
];

function citationsIn(text: string): string[] {
  return KNOWN_CITATIONS.filter((factId) => text.includes(factId));
}

function validateReply(text: string): string {
  const value = text.trim();
  if (!value || value.length > 1_200) throw new Error("The deliberation reply is invalid.");
  if (/FIN_ONLY_CANARY_7K2|CEO_ONLY_CANARY_M9Q/.test(value)) {
    throw new Error("The deliberation reply contained role-private canary data.");
  }
  return value;
}

function fallbackReply(role: Role, message: string): DeliberationReply {
  const normalized = message.toLowerCase();
  let text: string;
  if (
    role === "ceo" &&
    /(only if|provided|condition|launch.ready|readiness)/.test(normalized) &&
    !/(green.*before|before.*green)/.test(normalized)
  ) {
    text =
      "Do you mean Product readiness must remain GREEN at execution, and should activation also be limited to the approved campaign window? [f.product.readiness]";
  } else if (role === "ceo" && /green/.test(normalized) && /before/.test(normalized)) {
    text =
      "That is concrete: require Product readiness to remain GREEN and activation to occur before the campaign window closes. The interface can record it as a material condition, which will create a new version and stale prior consent. [f.product.readiness]";
  } else if (/(pilot|alternative|revers|opportunity)/.test(normalized)) {
    const pilot = projectScenario("Reversible pilot, 4 days");
    text = `The smallest reversible option is the four-day pilot: EUR ${pilot.downsideEur.toLocaleString("en-GB")} downside and EUR ${pilot.upsideEur.toLocaleString("en-GB")} upside. It tests demand before the full commitment. [${pilot.factId}]`;
  } else if (/(budget|afford|money|cost)/.test(normalized)) {
    const budget = getMetric("f.budget.remaining");
    const counter = getMetric("f.counter.support");
    text = `The frozen Finance record shows ${budget.value} unallocated. The full campaign uses EUR 30,000, while support capacity remains a downside: ${counter.value}. [${budget.factId}] [${counter.factId}]`;
  } else {
    const facts = searchEvidence(message).slice(0, 3);
    text = facts.length
      ? `The evidence most relevant to that question is: ${facts.map((fact) => `${fact.label}: ${fact.value} [${fact.factId}]`).join("; ")}.`
      : "I cannot support an answer from the current evidence. Ask about budget, readiness, downside, or a named scenario.";
  }
  return { text, citations: citationsIn(text), source: "fallback" };
}

export async function runDeliberationTurn(input: {
  role: Role;
  message: string;
  history: DeliberationTurn[];
  useModel?: boolean;
}): Promise<DeliberationReply> {
  const message = input.message.trim();
  if (!message || message.length > 1_000) throw new Error("Message must be 1–1000 characters.");
  const useModel = input.useModel ?? Boolean(process.env.GEMINI_API_KEY);
  if (!useModel) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("GEMINI_API_KEY is required for deliberation in production.");
    }
    return fallbackReply(input.role, message);
  }

  const history = input.history.slice(-8).map((turn) => ({
    speaker: turn.speaker,
    text: turn.text,
  }));
  const prompt = [
    `Authenticated role: ${input.role}.`,
    `Recent private conversation: ${JSON.stringify(history)}.`,
    `Keyholder message: ${JSON.stringify(message)}.`,
    "Use the tools for factual claims. Keep the answer under 140 words and include each supporting factId in square brackets.",
  ].join("\n");
  const sessionService = new InMemorySessionService();
  const runner = new Runner({
    appName: "twokeys_deliberation",
    agent: createDeliberationAgent(input.role),
    sessionService,
  });
  const sessionId = `deliberation-${crypto.randomUUID()}`;
  await sessionService.createSession({
    appName: "twokeys_deliberation",
    userId: input.role,
    sessionId,
  });
  let answer = "";
  for await (const event of runner.runAsync({
    userId: input.role,
    sessionId,
    newMessage: { role: "user", parts: [{ text: prompt }] },
    abortSignal: AbortSignal.timeout(25_000),
  })) {
    if (isFinalResponse(event)) answer = stringifyContent(event);
  }
  const text = validateReply(answer);
  return { text, citations: citationsIn(text), source: "adk" };
}
