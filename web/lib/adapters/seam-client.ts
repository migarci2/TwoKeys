import type { SeamDecisionView } from "../server/seam.ts";

/**
 * Minimal HTTP client for the TwoKeys seam. Every harness adapter (ADK tools,
 * the MCP server, and whatever follows) wraps this one class, so an adapter
 * for a new harness only has to translate its tool convention into these two
 * calls.
 */

export interface SeamClientOptions {
  /** Base URL of the TwoKeys web app, e.g. http://localhost:3000. */
  baseUrl: string;
  /** Bearer key matching the server's AGENT_SEAM_KEY, when configured. */
  agentKey?: string;
  /** Recorded in the proposal's audit trail. It has no standing in resolution. */
  agentId?: string;
  fetcher?: typeof fetch;
}

export class TwoKeysSeamError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.name = "TwoKeysSeamError";
    this.status = status;
    this.code = code;
  }
}

export class TwoKeysSeamClient {
  private readonly baseUrl: string;
  private readonly agentKey?: string;
  private readonly agentId?: string;
  private readonly fetcher: typeof fetch;

  constructor(options: SeamClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.agentKey = options.agentKey;
    this.agentId = options.agentId;
    this.fetcher = options.fetcher ?? fetch;
  }

  private headers(json: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers["Content-Type"] = "application/json";
    if (this.agentKey) headers.Authorization = `Bearer ${this.agentKey}`;
    return headers;
  }

  private async view(response: Response): Promise<SeamDecisionView> {
    const body = (await response.json().catch(() => null)) as
      | (SeamDecisionView & { error?: string; code?: string })
      | null;
    if (!response.ok || !body || typeof body !== "object" || !("state" in body)) {
      throw new TwoKeysSeamError(
        response.status,
        body?.code ?? null,
        body?.error ?? `TwoKeys seam returned HTTP ${response.status}.`,
      );
    }
    return body;
  }

  /**
   * propose_action(action, evidence) -> { decision_id, state }
   *
   * Returns immediately with a state, never a verdict. AUTHORIZED with a lease
   * means the action resolved to zero keyholders; PENDING means its shape
   * summoned humans and the decision takes as long as they take.
   */
  async proposeAction(action: unknown, evidence?: unknown): Promise<SeamDecisionView> {
    const response = await this.fetcher(`${this.baseUrl}/api/proposals`, {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify({ action, evidence, proposedBy: this.agentId }),
    });
    return this.view(response);
  }

  /** await_decision(decision_id) -> lease | denial | pending (single poll). */
  async awaitDecision(decisionId: string): Promise<SeamDecisionView> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/proposals/${encodeURIComponent(decisionId)}`,
      { headers: this.headers(false) },
    );
    return this.view(response);
  }

  /**
   * Polls until the decision leaves PENDING or the timeout elapses. The last
   * observed view is returned either way; a still-pending decision is a valid
   * outcome, not an error, because keyholders may simply not have decided yet.
   */
  async awaitDecisionSettled(
    decisionId: string,
    options: { pollMs?: number; timeoutMs?: number } = {},
  ): Promise<SeamDecisionView> {
    const pollMs = options.pollMs ?? 5_000;
    const deadline = Date.now() + (options.timeoutMs ?? 600_000);
    let view = await this.awaitDecision(decisionId);
    while (view.state === "PENDING" && Date.now() + pollMs <= deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      view = await this.awaitDecision(decisionId);
    }
    return view;
  }
}
