import { FunctionTool } from "@google/adk";
import { Type, type Schema } from "@google/genai";

import { TwoKeysSeamClient, type SeamClientOptions } from "./seam-client.ts";

/**
 * Reference adapter: the TwoKeys seam as Google ADK FunctionTools.
 *
 * An ADK agent keeps its own tools and credentials; these two tools are the
 * whole integration. The agent proposes an action, receives a state (never a
 * verdict), and polls for the lease when the action summoned keyholders.
 * Adapters for other harnesses follow the same shape around TwoKeysSeamClient.
 */

const PROPOSE_ACTION_PARAMETERS: Schema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.OBJECT,
      description: "The business action to authorize.",
      properties: {
        actionType: {
          type: Type.STRING,
          description: "Governed action type, e.g. google_ads.campaign.activate.",
        },
        campaign: {
          type: Type.OBJECT,
          properties: {
            customerRef: { type: Type.STRING },
            resourceRef: { type: Type.STRING },
            desiredStatus: { type: Type.STRING },
          },
          required: ["customerRef", "resourceRef", "desiredStatus"],
        },
        businessDecision: {
          type: Type.OBJECT,
          properties: {
            budgetCapMicros: {
              type: Type.STRING,
              description: "Total budget as integer micros, e.g. '30000000000' for EUR 30,000.",
            },
            currencyCode: { type: Type.STRING },
            startDate: { type: Type.STRING, description: "YYYY-MM-DD" },
            endDate: { type: Type.STRING, description: "YYYY-MM-DD" },
          },
          required: ["budgetCapMicros", "currencyCode", "startDate", "endDate"],
        },
      },
      required: ["actionType", "campaign", "businessDecision"],
    },
    evidence: {
      type: Type.OBJECT,
      description:
        "Optional map of fact id to { value, sourceId, observedAt } supporting the action.",
    },
  },
  required: ["action"],
};

const AWAIT_DECISION_PARAMETERS: Schema = {
  type: Type.OBJECT,
  properties: {
    decision_id: {
      type: Type.STRING,
      description: "The decision_id returned by propose_action.",
    },
  },
  required: ["decision_id"],
};

export interface TwoKeysAdkTools {
  client: TwoKeysSeamClient;
  proposeAction: FunctionTool<Schema>;
  awaitDecision: FunctionTool<Schema>;
  tools: [FunctionTool<Schema>, FunctionTool<Schema>];
}

export function createTwoKeysAdkTools(
  options: SeamClientOptions | TwoKeysSeamClient,
): TwoKeysAdkTools {
  const client =
    options instanceof TwoKeysSeamClient ? options : new TwoKeysSeamClient(options);

  const proposeAction = new FunctionTool<Schema>({
    name: "propose_action",
    description:
      "Propose a business action to TwoKeys for authorization. Returns a decision_id " +
      "and a state, never a verdict: AUTHORIZED with a single-use lease when policy " +
      "resolved the action to zero keyholders, PENDING when the action's material " +
      "properties summoned human keyholders. The proposing agent cannot choose or " +
      "influence who must consent.",
    parameters: PROPOSE_ACTION_PARAMETERS,
    execute: async (input) => {
      const args = (input ?? {}) as { action?: unknown; evidence?: unknown };
      return client.proposeAction(args.action, args.evidence);
    },
  });

  const awaitDecision = new FunctionTool<Schema>({
    name: "await_decision",
    description:
      "Collect the verdict for a previously proposed action: a lease, a denial, or " +
      "still pending. A decision that requires people takes as long as those people " +
      "take, so call this again later while it reports PENDING.",
    parameters: AWAIT_DECISION_PARAMETERS,
    isLongRunning: true,
    execute: async (input) => {
      const args = (input ?? {}) as { decision_id?: unknown };
      if (typeof args.decision_id !== "string") {
        throw new Error("decision_id must be the string returned by propose_action.");
      }
      return client.awaitDecision(args.decision_id);
    },
  });

  return { client, proposeAction, awaitDecision, tools: [proposeAction, awaitDecision] };
}
