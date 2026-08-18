# Harness integrations

**Status:** the seam, the MCP server, and the ADK adapter are implemented in
`web`. Install snippets for Claude Code, Codex and ChatGPT plugins, and
Antigravity were checked against the vendor docs on 2026-08-14; the remaining
harness formats evolve quickly, so confirm against each harness's own docs if a
snippet has drifted.

## The seam

Your agents keep their tools, credentials, and autonomy. The integration is one
call and one wait:

```text
propose_action(action, evidence) -> { decision_id, state }
await_decision(decision_id)      -> lease | denial | pending
```

The proposal returns a state, never a verdict. `AUTHORIZED` comes back in the
first call, with a single-use lease, when deterministic policy resolved the
action to zero keyholders. `PENDING` means the action's material properties
summoned humans, and the decision takes as long as those humans take.

Over HTTP the seam is two endpoints on the TwoKeys app:

```text
POST /api/proposals                { action, evidence?, proposedBy? }  -> 201 + view
GET  /api/proposals/{decision_id}                                      -> 200 + view
```

Requests carry `Authorization: Bearer <AGENT_SEAM_KEY>` when the server has
`AGENT_SEAM_KEY` configured. Without a configured key the seam is open in
development and closed in production.

```bash
curl -s -X POST "$TWOKEYS_BASE_URL/api/proposals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TWOKEYS_AGENT_KEY" \
  -d '{
    "proposedBy": "my-agent",
    "action": {
      "actionType": "google_ads.campaign.activate",
      "campaign": {
        "customerRef": "test-customer",
        "resourceRef": "preconfigured-campaign",
        "desiredStatus": "ENABLED"
      },
      "businessDecision": {
        "budgetCapMicros": "30000000000",
        "currencyCode": "EUR",
        "startDate": "2026-08-17",
        "endDate": "2026-08-30"
      }
    }
  }'
```

## The MCP server

Most coding harnesses speak the Model Context Protocol, so the primary install
target is one stdio MCP server that proxies the two seam calls:

```bash
cd web && npm run mcp
# equivalently: node --experimental-strip-types web/scripts/mcp-server.ts
```

| Env var | Meaning | Default |
|---|---|---|
| `TWOKEYS_BASE_URL` | Base URL of the TwoKeys app | `http://localhost:3000` |
| `TWOKEYS_AGENT_KEY` | Bearer key matching the server's `AGENT_SEAM_KEY` | unset |
| `TWOKEYS_AGENT_ID` | Audit-trail label for the agent; no standing in policy | unset |

It exposes exactly two tools, `propose_action` and `await_decision`. Everything
below is a way of registering this one server, except where a harness has no
MCP support, in which case the HTTP seam is used directly.

`web/integrations/plugin/` packages the same server as a plugin folder carrying
manifests for Claude Code, Codex and ChatGPT, and Antigravity side by side.

## Per harness

The list follows the harnesses on the landing page.

### Claude Code

```bash
claude mcp add --transport stdio twokeys \
  --env TWOKEYS_BASE_URL=http://localhost:3000 \
  --env TWOKEYS_AGENT_KEY=your-key \
  -- node --experimental-strip-types /ABSOLUTE/PATH/TO/TwoKeys/web/scripts/mcp-server.ts
```

Or commit a project-scoped `.mcp.json`:

```json
{
  "mcpServers": {
    "twokeys": {
      "type": "stdio",
      "command": "node",
      "args": ["--experimental-strip-types", "web/scripts/mcp-server.ts"],
      "env": { "TWOKEYS_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

The plugin folder `web/integrations/plugin/` also carries a
`.claude-plugin/plugin.json` plus `.mcp.json`, so it can be distributed through
a Claude Code plugin marketplace unchanged.

### Codex CLI, ChatGPT plugins

Register the server directly in Codex:

```bash
codex mcp add twokeys \
  --env TWOKEYS_BASE_URL=http://localhost:3000 \
  --env TWOKEYS_AGENT_KEY=your-key \
  -- node --experimental-strip-types /ABSOLUTE/PATH/TO/TwoKeys/web/scripts/mcp-server.ts
```

Or distribute the plugin folder: it carries `.codex-plugin/plugin.json` and
`.mcp.json`, which is the packaging ChatGPT and Codex expect. Add it to a
marketplace with `codex plugin marketplace add ./local-marketplace-root`, or
register the MCP server connection in ChatGPT developer mode (Settings,
Security and login, Developer mode, then Plugins) and let `@plugin-creator`
wire the plugin.

### Antigravity

The plugin folder carries the Antigravity manifest (`plugin.json`) and
`mcp_config.json`. Set the absolute script path in `mcp_config.json`, then:

```bash
agy plugin install /ABSOLUTE/PATH/TO/TwoKeys/web/integrations/plugin
agy plugin list
```

Antigravity stages the bundle under `~/.gemini/antigravity-cli/plugins/twokeys/`.
The IDE and CLI can also register the server through their MCP settings
directly.

### Gemini CLI

Add to `~/.gemini/settings.json` (or the project's `.gemini/settings.json`):

```json
{
  "mcpServers": {
    "twokeys": {
      "command": "node",
      "args": ["--experimental-strip-types", "/ABSOLUTE/PATH/TO/TwoKeys/web/scripts/mcp-server.ts"],
      "env": { "TWOKEYS_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in the project, or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "twokeys": {
      "command": "node",
      "args": ["--experimental-strip-types", "web/scripts/mcp-server.ts"],
      "env": { "TWOKEYS_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

### Copilot (VS Code)

Add to `.vscode/mcp.json`; note VS Code uses `servers`, not `mcpServers`:

```json
{
  "servers": {
    "twokeys": {
      "type": "stdio",
      "command": "node",
      "args": ["--experimental-strip-types", "web/scripts/mcp-server.ts"],
      "env": { "TWOKEYS_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "twokeys": {
      "command": "node",
      "args": ["--experimental-strip-types", "/ABSOLUTE/PATH/TO/TwoKeys/web/scripts/mcp-server.ts"],
      "env": { "TWOKEYS_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

### OpenCode

Add to `opencode.json`:

```json
{
  "mcp": {
    "twokeys": {
      "type": "local",
      "command": ["node", "--experimental-strip-types", "web/scripts/mcp-server.ts"],
      "environment": { "TWOKEYS_BASE_URL": "http://localhost:3000" }
    }
  }
}
```

### Replit

Replit Agent has no user-editable MCP config at the time of writing. Integrate
through the HTTP seam: store `TWOKEYS_BASE_URL` and `TWOKEYS_AGENT_KEY` as
Replit secrets and call the two endpoints from the app or agent code, as in the
curl example above.

### Jules

Jules runs asynchronously against a repo and has no MCP config. Give it the
HTTP seam: commit this document, and instruct Jules in `AGENTS.md` that any
material action must go through `POST /api/proposals` and poll
`GET /api/proposals/{decision_id}` until it holds a lease.

### OpenRouter

OpenRouter is a model gateway, not a harness, so the integration lives in your
tool-calling loop: expose `propose_action` and `await_decision` as tool
definitions to whatever model you route, and implement both by calling the
HTTP seam. `web/lib/adapters/seam-client.ts` is the reference client to wrap.

### Ollama

Same shape as OpenRouter for plain tool-calling loops against local models.
Ollama's CLI and app can also register MCP servers on recent versions; where
available, point them at the same stdio command used above.

### LangChain

Use the MCP adapter package to load the server as LangChain tools:

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "twokeys": {
        "transport": "stdio",
        "command": "node",
        "args": ["--experimental-strip-types", "web/scripts/mcp-server.ts"],
        "env": {"TWOKEYS_BASE_URL": "http://localhost:3000"},
    }
})
tools = await client.get_tools()
```

Or skip MCP and wrap the two HTTP calls as two `@tool` functions.

### Hugging Face

`huggingface_hub`'s tiny-agents and `smolagents` both consume MCP servers. For
tiny-agents, add to the agent's `agent.json`:

```json
{
  "servers": [
    {
      "type": "stdio",
      "command": "node",
      "args": ["--experimental-strip-types", "web/scripts/mcp-server.ts"],
      "env": { "TWOKEYS_BASE_URL": "http://localhost:3000" }
    }
  ]
}
```

### Google ADK (the reference adapter)

The in-repo Revenue Agent consumes the seam through
`web/lib/adapters/adk.ts`, which is the reference for writing native adapters:

```ts
import { LlmAgent } from "@google/adk";
import { createTwoKeysAdkTools } from "./lib/adapters/adk.ts";

const { tools } = createTwoKeysAdkTools({
  baseUrl: process.env.TWOKEYS_BASE_URL ?? "http://localhost:3000",
  agentKey: process.env.TWOKEYS_AGENT_KEY,
  agentId: "revenue-agent",
});

const agent = new LlmAgent({
  name: "revenue_agent",
  model: "gemini-3.7-flash",
  tools,
  instruction:
    "You may execute only actions for which you hold an unexpired TwoKeys lease.",
});
```

## What an adapter may never do

Every adapter is a client of the seam and nothing more. It cannot pick the
keyholders, shorten the wait, or construct a lease; those live behind the seam
in the [decision kernel](contracts.md). An adapter that caches, replays, or
fabricates a lease buys nothing, because the executor revalidates the complete
authority state and consumes the lease atomically before any external call.

## Related

- [Architecture](architecture.md)
- [Normative contracts](contracts.md)
- [Product vision: what ships](../01-product/vision.md)
