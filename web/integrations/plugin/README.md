# TwoKeys harness plugin

One folder, three harness manifests, one MCP server. The server proxies the
TwoKeys seam (`propose_action`, `await_decision`) at
`web/scripts/mcp-server.ts`; nothing in this folder holds authority logic.

| File | Harness |
|---|---|
| `.claude-plugin/plugin.json` + `.mcp.json` | Claude Code plugin |
| `.codex-plugin/plugin.json` + `.mcp.json` | ChatGPT and Codex plugin |
| `plugin.json` + `mcp_config.json` | Antigravity CLI plugin (`agy plugin install`) |

Before installing for Antigravity, replace the `/ABSOLUTE/PATH/TO/` placeholder
in `mcp_config.json`, since the bundle is copied out of the repo on install.

Install commands, per-harness snippets for every harness on the landing page,
and the HTTP seam reference live in `docs/03-system/integrations.md`.
