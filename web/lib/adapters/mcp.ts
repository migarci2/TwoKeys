import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { TwoKeysSeamClient } from "./seam-client.ts";

/**
 * The TwoKeys seam as an MCP server.
 *
 * MCP is the shared plugin surface across coding harnesses (Claude Code,
 * Codex/ChatGPT plugins, Antigravity, Cursor, and the rest), so this one
 * server is the install target for all of them. It is a pure proxy: both tools
 * translate to the same two HTTP calls every adapter uses, and no authority
 * logic lives on the client side of the seam.
 */

export function createTwoKeysMcpServer(client: TwoKeysSeamClient): McpServer {
  const server = new McpServer({ name: "twokeys", version: "0.1.0" });

  const respond = async (run: () => Promise<unknown>) => {
    try {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(await run(), null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: error instanceof Error ? error.message : "TwoKeys seam call failed.",
          },
        ],
      };
    }
  };

  server.registerTool(
    "propose_action",
    {
      description:
        "Propose a business action to TwoKeys for authorization. Returns a decision_id " +
        "and a state, never a verdict: AUTHORIZED with a single-use lease when policy " +
        "resolved the action to zero keyholders, PENDING when the action's material " +
        "properties summoned human keyholders. The proposing agent cannot choose or " +
        "influence who must consent.",
      inputSchema: {
        action: z
          .object({
            actionType: z.string(),
            campaign: z.object({
              customerRef: z.string(),
              resourceRef: z.string(),
              desiredStatus: z.string(),
            }),
            businessDecision: z.object({
              budgetCapMicros: z
                .string()
                .describe("Total budget as integer micros, e.g. '30000000000' for EUR 30,000."),
              currencyCode: z.string(),
              startDate: z.string().describe("YYYY-MM-DD"),
              endDate: z.string().describe("YYYY-MM-DD"),
            }),
          })
          .describe("The business action to authorize."),
        evidence: z
          .record(
            z.string(),
            z.object({ value: z.string(), sourceId: z.string(), observedAt: z.string() }),
          )
          .optional()
          .describe("Optional map of fact id to supporting evidence."),
      },
    },
    async ({ action, evidence }) => respond(() => client.proposeAction(action, evidence)),
  );

  server.registerTool(
    "await_decision",
    {
      description:
        "Collect the verdict for a previously proposed action: a lease, a denial, or " +
        "still pending. A decision that requires people takes as long as those people " +
        "take, so call this again later while it reports PENDING.",
      inputSchema: {
        decision_id: z.string().describe("The decision_id returned by propose_action."),
      },
    },
    async ({ decision_id }) => respond(() => client.awaitDecision(decision_id)),
  );

  return server;
}

export async function runTwoKeysMcpServer(client: TwoKeysSeamClient): Promise<void> {
  await createTwoKeysMcpServer(client).connect(new StdioServerTransport());
}
