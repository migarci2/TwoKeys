import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createTwoKeysAdkTools } from "../adapters/adk.ts";
import { createTwoKeysMcpServer } from "../adapters/mcp.ts";
import { TwoKeysSeamClient, TwoKeysSeamError } from "../adapters/seam-client.ts";
import { AuthorityError, approve, issueLease } from "./authority.ts";
import { MemoryProposalStore } from "./proposal-store.ts";
import { awaitDecisionSeam, proposeActionSeam, type SeamStores } from "./seam.ts";
import { MemoryDecisionStore } from "./store.ts";

function proposalAction(budgetCapMicros: string) {
  return {
    actionType: "google_ads.campaign.activate",
    campaign: {
      customerRef: "test-customer",
      resourceRef: "preconfigured-campaign",
      desiredStatus: "ENABLED",
    },
    businessDecision: {
      budgetCapMicros,
      currencyCode: "EUR",
      startDate: "2026-08-17",
      endDate: "2026-08-30",
    },
  };
}

/**
 * A plain node:http mount of the two seam operations, so adapters are tested
 * end to end over real HTTP against the same library functions the Next.js
 * routes wrap.
 */
function startSeamServer(stores: SeamStores): Promise<{ baseUrl: string; server: Server }> {
  const server = createServer((request, response) => {
    const reply = (status: number, body: unknown) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    const fail = (error: unknown) => {
      if (error instanceof AuthorityError) {
        const status =
          error.code === "INVALID_INPUT" ? 400 : error.code === "DECISION_NOT_FOUND" ? 404 : 409;
        reply(status, { error: error.message, code: error.code });
        return;
      }
      reply(503, { error: "seam failure" });
    };

    const path = request.url ?? "";
    if (request.method === "POST" && path === "/api/proposals") {
      let text = "";
      request.on("data", (chunk) => (text += chunk));
      request.on("end", () => {
        void (async () => {
          try {
            reply(201, await proposeActionSeam(stores, JSON.parse(text)));
          } catch (error) {
            fail(error);
          }
        })();
      });
      return;
    }
    const match = path.match(/^\/api\/proposals\/([^/]+)$/);
    if (request.method === "GET" && match) {
      void (async () => {
        try {
          reply(200, await awaitDecisionSeam(stores, decodeURIComponent(match[1]!)));
        } catch (error) {
          fail(error);
        }
      })();
      return;
    }
    reply(404, { error: "not found" });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ baseUrl: `http://127.0.0.1:${port}`, server });
    });
  });
}

test("C1: the seam client authorizes a routine action and polls a material one over HTTP", async () => {
  const stores: SeamStores = {
    decisions: new MemoryDecisionStore(),
    proposals: new MemoryProposalStore(),
  };
  const { baseUrl, server } = await startSeamServer(stores);
  try {
    const client = new TwoKeysSeamClient({ baseUrl, agentId: "adk-revenue-agent" });

    const routine = await client.proposeAction(proposalAction("9000000000"));
    assert.equal(routine.state, "AUTHORIZED");
    if (routine.state === "AUTHORIZED") assert.equal(routine.lease.singleUse, true);

    const material = await client.proposeAction(proposalAction("30000000000"));
    assert.equal(material.state, "PENDING");
    assert.deepEqual(material.requiredRoles, ["finance", "ceo"]);

    assert.equal((await client.awaitDecision(material.decisionId)).state, "PENDING");

    // The HTTP path evaluates on the real clock, so approvals and the lease
    // are issued now rather than at the frozen fixture time.
    await stores.decisions.update((state) => approve(state, "finance", "finance"));
    await stores.decisions.update((state) => approve(state, "ceo", "ceo"));
    await stores.decisions.update((state) => issueLease(state));

    const settled = await client.awaitDecisionSettled(material.decisionId, {
      pollMs: 10,
      timeoutMs: 1_000,
    });
    assert.equal(settled.state, "AUTHORIZED");

    await assert.rejects(
      client.awaitDecision(`proposal_${"0".repeat(32)}`),
      (error) => error instanceof TwoKeysSeamError && error.status === 404,
    );
  } finally {
    server.close();
  }
});

test("C2: the ADK FunctionTools expose the seam to an ADK agent", async () => {
  const stores: SeamStores = {
    decisions: new MemoryDecisionStore(),
    proposals: new MemoryProposalStore(),
  };
  const { baseUrl, server } = await startSeamServer(stores);
  try {
    const { proposeAction, awaitDecision, tools } = createTwoKeysAdkTools({
      baseUrl,
      agentId: "adk-revenue-agent",
    });
    assert.equal(tools.length, 2);
    assert.equal(proposeAction._getDeclaration().name, "propose_action");
    assert.equal(awaitDecision._getDeclaration().name, "await_decision");

    const toolContext = undefined as never;
    const proposed = (await proposeAction.runAsync({
      args: { action: proposalAction("30000000000") },
      toolContext,
    })) as { state: string; decisionId: string };
    assert.equal(proposed.state, "PENDING");

    const awaited = (await awaitDecision.runAsync({
      args: { decision_id: proposed.decisionId },
      toolContext,
    })) as { state: string };
    assert.equal(awaited.state, "PENDING");

    const routine = (await proposeAction.runAsync({
      args: { action: proposalAction("9000000000") },
      toolContext,
    })) as { state: string; lease: { singleUse: boolean } };
    assert.equal(routine.state, "AUTHORIZED");
    assert.equal(routine.lease.singleUse, true);
  } finally {
    server.close();
  }
});

test("C3: the MCP server proxies both tools without weakening seam errors", async () => {
  const stores: SeamStores = {
    decisions: new MemoryDecisionStore(),
    proposals: new MemoryProposalStore(),
  };
  const { baseUrl, server } = await startSeamServer(stores);
  try {
    const mcpServer = createTwoKeysMcpServer(new TwoKeysSeamClient({ baseUrl }));
    const mcpClient = new Client({ name: "test-harness", version: "0.0.1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      mcpServer.connect(serverTransport),
      mcpClient.connect(clientTransport),
    ]);

    const listed = await mcpClient.listTools();
    assert.deepEqual(
      listed.tools.map((tool) => tool.name).sort(),
      ["await_decision", "propose_action"],
    );

    const proposed = await mcpClient.callTool({
      name: "propose_action",
      arguments: { action: proposalAction("9000000000") },
    });
    const proposedView = JSON.parse(
      (proposed.content as Array<{ text: string }>)[0]!.text,
    ) as { state: string; decisionId: string };
    assert.equal(proposedView.state, "AUTHORIZED");

    const awaited = await mcpClient.callTool({
      name: "await_decision",
      arguments: { decision_id: proposedView.decisionId },
    });
    assert.equal(
      (JSON.parse((awaited.content as Array<{ text: string }>)[0]!.text) as { state: string })
        .state,
      "AUTHORIZED",
    );

    // A rejected proposal surfaces as a tool error, not a fabricated verdict.
    const rejected = await mcpClient.callTool({
      name: "propose_action",
      arguments: { action: proposalAction("3e10") },
    });
    assert.equal(rejected.isError, true);

    await mcpClient.close();
    await mcpServer.close();
  } finally {
    server.close();
  }
});
