import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import {
  ACTION_ID,
  AuthorityError,
  POLICY_VERSION,
  approvalIsValid,
  canonicalDigest,
  currentAction,
  decisionStatus,
  resolveRequiredRoles,
  type ActionLeaseRecord,
  type ActionVersionRecord,
  type DecisionAggregate,
  type Role,
} from "./authority.ts";
import type { ProposalStore } from "./proposal-store.ts";
import type { DecisionStore } from "./store.ts";

/**
 * The public integration seam. Any external agent integrates through exactly
 * two calls:
 *
 *   propose_action(action, evidence) -> { decision_id, state }
 *   await_decision(decision_id)      -> lease | denial | pending
 *
 * The proposal returns a state, never a verdict: a decision that requires
 * people takes as long as those people take. AUTHORIZED can come back in the
 * first call only when deterministic policy resolved the action to zero
 * keyholders. PENDING means the action's shape summoned humans.
 */

export interface ProposalActionRecord {
  schemaVersion: "twokeys.proposal-action.v1";
  actionType: "google_ads.campaign.activate";
  campaign: {
    customerRef: "test-customer";
    resourceRef: "preconfigured-campaign";
    currentStatus: "PAUSED";
    desiredStatus: "ENABLED";
  };
  businessDecision: {
    budgetCapMicros: string;
    currencyCode: "EUR";
    startDate: string;
    endDate: string;
  };
}

export interface ProposalEvidenceBundle {
  schemaVersion: "twokeys.proposal-evidence.v1";
  facts: Record<string, { value: string; sourceId: string; observedAt: string }>;
  hash: string;
}

export type ProposalState = "AUTHORIZED" | "PENDING" | "DENIED";

export interface ProposalLeaseRecord {
  leaseId: string;
  decisionId: string;
  actionHash: string;
  evidenceBundleHash: string;
  policyVersion: typeof POLICY_VERSION;
  requiredRoles: Role[];
  approvalIds: string[];
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  revokedAt: string | null;
  consumedAt: string | null;
}

export interface ProposalAuditEntry {
  at: string;
  event: "PROPOSED" | "AUTHORIZED_ZERO_KEYHOLDERS" | "LEASE_ISSUED" | "BOUND_TO_DECISION";
  detail: string;
}

export interface ProposalDecisionRecord {
  schemaVersion: "twokeys.proposal.v1";
  decisionId: string;
  /** Recorded for the audit trail only. It is never an input to resolution. */
  proposedBy: string;
  action: ProposalActionRecord;
  actionHash: string;
  evidence: ProposalEvidenceBundle;
  policyVersion: typeof POLICY_VERSION;
  requiredRoles: Role[];
  matchedRuleIds: string[];
  state: ProposalState;
  /** Set when keyholders are required and the demo decision governs the action. */
  boundActionId: typeof ACTION_ID | null;
  /** Present only on the zero-keyholder path. */
  lease: ProposalLeaseRecord | null;
  audit: ProposalAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SeamLeaseView {
  leaseId: string;
  actionHash: string;
  evidenceBundleHash: string;
  policyVersion: typeof POLICY_VERSION;
  requiredRoles: Role[];
  approvalIds: string[];
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  consumedAt: string | null;
  singleUse: true;
}

interface SeamViewBase {
  decisionId: string;
  policyVersion: typeof POLICY_VERSION;
  requiredRoles: Role[];
  matchedRuleIds: string[];
  proposedActionHash: string;
}

export type SeamDecisionView =
  | (SeamViewBase & { state: "AUTHORIZED"; lease: SeamLeaseView })
  | (SeamViewBase & {
      state: "PENDING";
      approvals: Array<{ role: Role; status: "APPROVED" | "PENDING" | "STALE" }>;
    })
  | (SeamViewBase & { state: "DENIED"; reason: string });

const PROPOSAL_LEASE_MINUTES = 5;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DECISION_ID = /^proposal_[a-f0-9]{32}$/;
const MAX_FACTS = 32;
const MAX_FACT_STRING = 512;

function invalid(message: string): never {
  throw new AuthorityError("INVALID_INPUT", message);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function shortString(value: unknown, field: string, max = MAX_FACT_STRING): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > max) {
    invalid(`${field} must be a non-empty string of at most ${max} characters.`);
  }
  return value;
}

function dateOnly(value: unknown, field: string): string {
  const text = shortString(value, field, 10);
  if (!DATE_ONLY.test(text) || !Number.isFinite(Date.parse(text))) {
    invalid(`${field} must be a YYYY-MM-DD date.`);
  }
  return text;
}

/**
 * Parses an untrusted proposal into the closed canonical shape. Only known
 * fields are picked, so nothing a caller adds can reach the hash, and every
 * field outside the closed vocabulary is rejected rather than defaulted.
 */
export function parseProposedAction(input: unknown): ProposalActionRecord {
  const raw = record(input, "action");
  if (raw.actionType !== "google_ads.campaign.activate") {
    invalid("action.actionType is outside the governed action vocabulary.");
  }
  const campaign = record(raw.campaign, "action.campaign");
  if (campaign.customerRef !== "test-customer") {
    invalid("action.campaign.customerRef must reference the governed test customer.");
  }
  if (campaign.resourceRef !== "preconfigured-campaign") {
    invalid("action.campaign.resourceRef must reference the governed campaign.");
  }
  if (campaign.desiredStatus !== "ENABLED") {
    invalid("action.campaign.desiredStatus must be ENABLED.");
  }
  const business = record(raw.businessDecision, "action.businessDecision");
  if (business.currencyCode !== "EUR") {
    invalid("action.businessDecision.currencyCode is outside the governed currency vocabulary.");
  }
  const startDate = dateOnly(business.startDate, "action.businessDecision.startDate");
  const endDate = dateOnly(business.endDate, "action.businessDecision.endDate");
  if (endDate < startDate) {
    invalid("action.businessDecision.endDate must not precede startDate.");
  }
  const budgetCapMicros = shortString(
    business.budgetCapMicros,
    "action.businessDecision.budgetCapMicros",
    32,
  );

  return {
    schemaVersion: "twokeys.proposal-action.v1",
    actionType: "google_ads.campaign.activate",
    campaign: {
      customerRef: "test-customer",
      resourceRef: "preconfigured-campaign",
      currentStatus: "PAUSED",
      desiredStatus: "ENABLED",
    },
    businessDecision: {
      budgetCapMicros,
      currencyCode: "EUR",
      startDate,
      endDate,
    },
  };
}

export function parseProposalEvidence(input: unknown): ProposalEvidenceBundle {
  const facts: ProposalEvidenceBundle["facts"] = {};
  if (input !== undefined && input !== null) {
    const raw = record(input, "evidence");
    const entries = Object.entries(raw);
    if (entries.length > MAX_FACTS) {
      invalid(`evidence may contain at most ${MAX_FACTS} facts.`);
    }
    for (const [factId, value] of entries) {
      shortString(factId, "evidence fact id", 64);
      const fact = record(value, `evidence[${factId}]`);
      facts[factId] = {
        value: shortString(fact.value, `evidence[${factId}].value`),
        sourceId: shortString(fact.sourceId, `evidence[${factId}].sourceId`),
        observedAt: shortString(fact.observedAt, `evidence[${factId}].observedAt`, 64),
      };
    }
  }
  const withoutHash = { schemaVersion: "twokeys.proposal-evidence.v1" as const, facts };
  return { ...withoutHash, hash: canonicalDigest(withoutHash) };
}

function materialProperties(action: ProposalActionRecord) {
  return {
    actionType: action.actionType,
    budgetCapMicros: action.businessDecision.budgetCapMicros,
    currencyCode: action.businessDecision.currencyCode,
  };
}

/**
 * True when the proposal's material fields are the ones the governed demo
 * decision canonicalizes. Fixture-owned material fields the proposal schema
 * does not carry (target scope, conversion goal, landing asset) are outside
 * this comparison by construction.
 */
export function proposalMatchesAction(
  proposal: ProposalActionRecord,
  action: ActionVersionRecord,
): boolean {
  return (
    proposal.actionType === action.actionType &&
    proposal.campaign.customerRef === action.campaign.customerRef &&
    proposal.campaign.resourceRef === action.campaign.resourceRef &&
    proposal.campaign.desiredStatus === action.campaign.desiredStatus &&
    proposal.businessDecision.budgetCapMicros === action.businessDecision.budgetCapMicros &&
    proposal.businessDecision.currencyCode === action.businessDecision.currencyCode &&
    proposal.businessDecision.startDate === action.businessDecision.startDate &&
    proposal.businessDecision.endDate === action.businessDecision.endDate
  );
}

/**
 * Issues the direct lease for a zero-keyholder proposal.
 *
 * Defense in depth: the required set is recomputed from the canonical action
 * and the stored hash is reverified, so a record that merely claims an empty
 * keyholder set, or an action edited after resolution, can never receive a
 * lease. An action whose shape summons keyholders is refused here even if
 * every caller upstream was compromised.
 */
export function issueProposalLease(
  proposal: Pick<ProposalDecisionRecord, "decisionId" | "action" | "actionHash" | "evidence">,
  now: string,
): ProposalLeaseRecord {
  const resolution = resolveRequiredRoles(materialProperties(proposal.action));
  if (resolution.requiredRoles.length !== 0) {
    throw new AuthorityError(
      "APPROVALS_MISSING",
      "This action resolves to keyholders; a direct lease would bypass their consent.",
    );
  }
  if (canonicalDigest(proposal.action) !== proposal.actionHash) {
    throw new AuthorityError(
      "HASH_MISMATCH",
      "The proposal action no longer matches its recorded hash.",
    );
  }
  return {
    leaseId: `lease_${randomUUID().replaceAll("-", "")}`,
    decisionId: proposal.decisionId,
    actionHash: proposal.actionHash,
    evidenceBundleHash: proposal.evidence.hash,
    policyVersion: resolution.policyVersion,
    requiredRoles: [],
    approvalIds: [],
    issuedAt: now,
    expiresAt: new Date(Date.parse(now) + PROPOSAL_LEASE_MINUTES * 60_000).toISOString(),
    nonce: randomBytes(18).toString("base64url"),
    revokedAt: null,
    consumedAt: null,
  };
}

/**
 * Creates a proposal decision from untrusted agent input. The required roles
 * are resolved from the action's material properties before anything the
 * agent sent is trusted; the agent's identity is recorded but has no standing.
 */
export function createProposal(
  payload: unknown,
  governed: DecisionAggregate,
  now = new Date().toISOString(),
): ProposalDecisionRecord {
  const body = record(payload, "request body");
  const action = parseProposedAction(body.action);
  const evidence = parseProposalEvidence(body.evidence);
  const proposedBy =
    body.proposedBy === undefined
      ? "external-agent"
      : shortString(body.proposedBy, "proposedBy", 128);
  const resolution = resolveRequiredRoles(materialProperties(action));
  const decisionId = `proposal_${randomUUID().replaceAll("-", "")}`;

  const proposal: ProposalDecisionRecord = {
    schemaVersion: "twokeys.proposal.v1",
    decisionId,
    proposedBy,
    action,
    actionHash: canonicalDigest(action),
    evidence,
    policyVersion: resolution.policyVersion,
    requiredRoles: resolution.requiredRoles,
    matchedRuleIds: resolution.matchedRuleIds,
    state: "PENDING",
    boundActionId: null,
    lease: null,
    audit: [
      {
        at: now,
        event: "PROPOSED",
        detail:
          `Proposed by ${proposedBy}. Policy ${resolution.policyVersion} resolved ` +
          `required roles [${resolution.requiredRoles.join(", ")}] from the action's ` +
          `material properties via rules [${resolution.matchedRuleIds.join(", ")}].`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  if (resolution.requiredRoles.length === 0) {
    proposal.state = "AUTHORIZED";
    proposal.lease = issueProposalLease(proposal, now);
    proposal.audit.push(
      {
        at: now,
        event: "AUTHORIZED_ZERO_KEYHOLDERS",
        detail:
          "The required keyholder set is empty, so the invariant is satisfied " +
          "with zero approvals and the action is authorized on proposal.",
      },
      {
        at: now,
        event: "LEASE_ISSUED",
        detail: `Single-use lease ${proposal.lease.leaseId} issued directly, expires ${proposal.lease.expiresAt}.`,
      },
    );
    return proposal;
  }

  // Keyholders are required. This build governs a single decision, so the
  // proposal must be the canonical launch action; anything else has no
  // deliberation surface behind it and is rejected rather than left pending
  // with nobody summoned.
  const action0 = currentAction(governed);
  if (!proposalMatchesAction(action, action0)) {
    invalid(
      "This action requires keyholder consent, and this build governs a single " +
        "decision: the proposal must match the canonical launch action " +
        `(EUR ${Number(BigInt(action0.businessDecision.budgetCapMicros) / BigInt(1_000_000))} ` +
        `budget, ${action0.businessDecision.startDate} to ${action0.businessDecision.endDate}).`,
    );
  }
  proposal.boundActionId = ACTION_ID;
  proposal.audit.push({
    at: now,
    event: "BOUND_TO_DECISION",
    detail: `Bound to decision ${ACTION_ID}; Finance and CEO deliberation surfaces govern it.`,
  });
  return proposal;
}

function leaseView(
  lease: ActionLeaseRecord | ProposalLeaseRecord,
  requiredRoles: Role[],
): SeamLeaseView {
  return {
    leaseId: lease.leaseId,
    actionHash: lease.actionHash,
    evidenceBundleHash: lease.evidenceBundleHash,
    policyVersion: lease.policyVersion,
    requiredRoles,
    approvalIds: [...lease.approvalIds],
    issuedAt: lease.issuedAt,
    expiresAt: lease.expiresAt,
    revokedAt: lease.revokedAt,
    consumedAt: lease.consumedAt,
    singleUse: true,
  };
}

/**
 * Computes the seam verdict for a proposal. AUTHORIZED always carries a lease:
 * a zero-keyholder proposal returns its direct lease, and a bound proposal
 * returns the kernel lease only after the kernel issued one, which itself
 * requires every required role's valid approval of the same hashes.
 */
export function awaitProposalDecision(
  proposal: ProposalDecisionRecord,
  governed: DecisionAggregate | null,
  now = new Date().toISOString(),
): SeamDecisionView {
  const base: SeamViewBase = {
    decisionId: proposal.decisionId,
    policyVersion: proposal.policyVersion,
    requiredRoles: [...proposal.requiredRoles],
    matchedRuleIds: [...proposal.matchedRuleIds],
    proposedActionHash: proposal.actionHash,
  };

  if (proposal.requiredRoles.length === 0) {
    if (!proposal.lease) {
      throw new AuthorityError(
        "LEASE_NOT_FOUND",
        "A zero-keyholder proposal must carry its direct lease.",
      );
    }
    return { ...base, state: "AUTHORIZED", lease: leaseView(proposal.lease, []) };
  }

  if (proposal.boundActionId === null || governed === null) {
    throw new AuthorityError(
      "INVALID_INPUT",
      "A keyholder proposal must be bound to a governed decision.",
    );
  }
  const action = currentAction(governed);
  if (!proposalMatchesAction(proposal.action, action)) {
    // The governed decision moved materially away from what was proposed. Its
    // lease binds a different action, so it can never authorize this proposal.
    return {
      ...base,
      state: "DENIED",
      reason: "The governed decision no longer matches the proposed action.",
    };
  }

  const status = decisionStatus(governed, now);
  if (status === "LEASED" || status === "CONSUMED" || status === "CONFIRMED") {
    const lease = governed.leases.find((item) => item.actionVersion === action.version);
    if (lease) {
      // The verdict's lease carries the canonical action hash, which may be a
      // keyholder-refined version of the proposed hash; both are reported.
      return {
        ...base,
        state: "AUTHORIZED",
        lease: leaseView(lease, [...action.requiredRoles]),
      };
    }
  }
  return {
    ...base,
    state: "PENDING",
    approvals: action.requiredRoles.map((role) => {
      const valid = governed.approvals.some(
        (item) => item.role === role && approvalIsValid(item, action, now),
      );
      const stale = governed.approvals.some(
        (item) => item.role === role && item.staleAt !== null,
      );
      return { role, status: valid ? "APPROVED" : stale ? "STALE" : "PENDING" };
    }),
  };
}

export interface SeamStores {
  decisions: DecisionStore;
  proposals: ProposalStore;
}

export async function proposeActionSeam(
  stores: SeamStores,
  payload: unknown,
  now = new Date().toISOString(),
): Promise<SeamDecisionView> {
  const governed = await stores.decisions.read(now);
  const proposal = createProposal(payload, governed, now);
  await stores.proposals.create(proposal);
  return awaitProposalDecision(proposal, proposal.boundActionId ? governed : null, now);
}

export async function awaitDecisionSeam(
  stores: SeamStores,
  decisionId: string,
  now = new Date().toISOString(),
): Promise<SeamDecisionView> {
  if (!DECISION_ID.test(decisionId)) {
    invalid("decision_id is not a TwoKeys proposal id.");
  }
  const proposal = await stores.proposals.read(decisionId);
  if (!proposal) {
    throw new AuthorityError("DECISION_NOT_FOUND", "No proposal exists for this decision_id.");
  }
  const governed = proposal.boundActionId ? await stores.decisions.read(now) : null;
  return awaitProposalDecision(proposal, governed, now);
}

const AGENT_KEY_DIGEST_SECRET = "twokeys-agent-seam-key-comparison";

function keyDigest(value: string): Buffer {
  return createHmac("sha256", AGENT_KEY_DIGEST_SECRET).update(value).digest();
}

/**
 * Bearer authentication for the agent seam. Sessions and origin checks guard
 * the human routes; agents authenticate with AGENT_SEAM_KEY instead. Without a
 * configured key the seam is open in development and closed in production.
 */
export function agentSeamRequestIsAuthorized(authorizationHeader: string | null): boolean {
  const configured = process.env.AGENT_SEAM_KEY?.trim();
  if (!configured) return process.env.NODE_ENV !== "production";
  if (configured.length < 16) return false;
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const candidate = authorizationHeader.slice("Bearer ".length);
  if (candidate.length === 0 || candidate.length > 256) return false;
  return timingSafeEqual(keyDigest(candidate), keyDigest(configured));
}
