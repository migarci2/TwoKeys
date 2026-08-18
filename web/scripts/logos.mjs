// Regenerate lib/agent-logos.ts from the simple-icons dev dependency.
//   node scripts/logos.mjs
import { writeFileSync } from "node:fs";
import * as si from "simple-icons";

// Two rows of six. Coding and computer-use agents only — automation tools
// like Zapier are a different category and their marks carry a filled plate
// that reads as a white box on the blue canvas.
const WANT = [
  // row one
  ["claude", "Claude Code"],
  ["cursor", "Cursor"],
  ["githubcopilot", "Copilot"],
  ["googlegemini", "Gemini"],
  ["windsurf", "Windsurf"],
  ["replit", "Replit"],
  // row two
  ["googlejules", "Jules"],
  ["opencode", "OpenCode"],
  ["openrouter", "OpenRouter"],
  ["ollama", "Ollama"],
  ["langchain", "LangChain"],
  ["huggingface", "Hugging Face"],
];

const logos = WANT.map(([key, label]) => {
  const icon = si["si" + key[0].toUpperCase() + key.slice(1)];
  if (!icon) throw new Error(`simple-icons has no entry for ${key}`);
  return { label, path: icon.path };
});

writeFileSync(
  "lib/agent-logos.ts",
  `export interface AgentLogo {
  label: string;
  path: string;
}

/**
 * Brand marks from Simple Icons (CC0), extracted at build time so the runtime
 * bundle carries the path strings instead of the whole icon package.
 * All are drawn on a 24x24 viewBox.
 *
 * Regenerate: node scripts/logos.mjs
 */
export const AGENT_LOGOS: AgentLogo[] = ${JSON.stringify(logos, null, 2)};
`,
);
console.log(`wrote ${logos.length} logos`);
