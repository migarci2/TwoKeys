import { runTwoKeysMcpServer } from "../lib/adapters/mcp.ts";
import { TwoKeysSeamClient } from "../lib/adapters/seam-client.ts";

/**
 * Stdio entry point for the TwoKeys MCP server.
 *
 * Run: node --experimental-strip-types scripts/mcp-server.ts
 * Env: TWOKEYS_BASE_URL  base URL of the TwoKeys app (default http://localhost:3000)
 *      TWOKEYS_AGENT_KEY bearer key matching the server's AGENT_SEAM_KEY
 *      TWOKEYS_AGENT_ID  audit-trail label for this agent (no standing in policy)
 */

await runTwoKeysMcpServer(
  new TwoKeysSeamClient({
    baseUrl: process.env.TWOKEYS_BASE_URL || "http://localhost:3000",
    agentKey: process.env.TWOKEYS_AGENT_KEY || undefined,
    agentId: process.env.TWOKEYS_AGENT_ID || undefined,
  }),
);
