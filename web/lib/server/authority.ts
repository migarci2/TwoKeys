import { createHash, randomBytes, randomUUID } from "node:crypto";

import { KEYHOLDER_POLICY } from "./policy.ts";

export const ACTION_ID = "launch-eu-001";
export const POLICY_VERSION = "finance-ceo-v1";
// The closed roster of keyholder roles this build can authenticate. It is not
// the per-action requirement: each action's requiredRoles come from
// resolveRequiredRoles, which reads the action's material properties.
export const REQUIRED_ROLES = ["finance", "ceo"] as const;

export type Role = (typeof REQUIRED_ROLES)[number];
export type CampaignStatus = "PAUSED" | "ENABLED";

export type ExecutionCondition =
  | {
      type: "product_readiness_equals";
      sourceFactId: "product.readiness";
      expected: "GREEN";
    }
  | { type: "execute_before"; timestamp: string };

export interface EvidenceFact {
  value: string;
  unit?: string;
  sourceId: string;
  observedAt: string;
}

export interface EvidenceBundle {
  schemaVersion: "twokeys.evidence.v1";
  bundleId: string;
  facts: Record<string, EvidenceFact>;
  assumptions: Array<{ factId: string; statement: string; sourceId: string }>;
  counterevidence: Array<{
    factId: string;
    statement: string;
    sourceId: string;
  }>;
  hash: string;
}

export interface ActionVersionRecord {
  schemaVersion: "twokeys.action.v1";
  actionId: typeof ACTION_ID;
  version: number;
  actionType: "google_ads.campaign.activate";
  campaign: {
    customerRef: "test-customer";
    resourceRef: "preconfigured-campaign";
    currentStatus: "PAUSED";
    desiredStatus: "ENABLED";
    configurationSnapshotHash: string;
  };
  businessDecision: {
    budgetCapMicros: "30000000000";
    currencyCode: "EUR";
    startDate: string;
    endDate: string;
    targetScopeDigest: string;
    conversionGoal: "PURCHASE";
    landingPageDigest: string;
  };
  executionConditions: ExecutionCondition[];
  evidenceBundleHash: string;
  policyVersion: typeof POLICY_VERSION;
  requiredRoles: Role[];
  createdAt: string;
  actionHash: string;
  changedSincePrevious: string[];
}

export interface ApprovalRecord {
  approvalId: string;
  role: Role;
  principalId: string;
  actionId: typeof ACTION_ID;
  actionVersion: number;
  actionHash: string;
  evidenceBundleHash: string;
  policyVersion: typeof POLICY_VERSION;
  decision: "APPROVED";
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  revokedAt: string | null;
  staleAt: string | null;
}

export interface ActionLeaseRecord {
  leaseId: string;
  actionId: typeof ACTION_ID;
  actionVersion: number;
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

export interface ExecutionReceipt {
  receiptId: string;
  leaseId: string;
  actionHash: string;
  provider: "google_ads";
  environment: "test_account";
  operation: "campaign.status:PAUSED->ENABLED";
  resourceName: string;
  requestId: string | null;
  requestedAt: string;
  observedAt: string;
  observedStatus: "ENABLED";
  result: "CONFIRMED";
}

export interface DecisionAggregate {
  schemaVersion: "twokeys.decision.v1";
  actionId: typeof ACTION_ID;
  evidence: EvidenceBundle;
  actions: ActionVersionRecord[];
  approvals: ApprovalRecord[];
  leases: ActionLeaseRecord[];
  receipts: ExecutionReceipt[];
  updatedAt: string;
}

export type AuthorityErrorCode =
  | "INVALID_INPUT"
  | "ROLE_FORBIDDEN"
  | "APPROVALS_MISSING"
  | "APPROVAL_EXPIRED"
  | "DECISION_NOT_FOUND"
  | "HASH_MISMATCH"
  | "LEASE_EXISTS"
  | "LEASE_NOT_FOUND"
  | "LEASE_CONSUMED"
  | "LEASE_EXPIRED"
  | "LEASE_REVOKED"
  | "SNAPSHOT_DRIFT"
  | "CONDITION_FAILED"
  | "EXTERNAL_UNCONFIRMED"
  | "RECONCILIATION_REQUIRED"
  | "ALREADY_CONFIRMED";

export class AuthorityError extends Error {
  readonly code: AuthorityErrorCode;

  constructor(code: AuthorityErrorCode, message: string) {
    super(message);
    this.name = "AuthorityError";
    this.code = code;
  }
}

const minute = 60_000;

export interface MaterialActionProperties {
  actionType: string;
  budgetCapMicros: string;
  currencyCode: string;
}

export interface KeyholderResolution {
  policyVersion: typeof POLICY_VERSION;
  requiredRoles: Role[];
  matchedRuleIds: string[];
}

const CANONICAL_MICROS = /^(0|[1-9][0-9]{0,17})$/;

function parseMicros(value: unknown, field: string): bigint {
  if (typeof value !== "string" || !CANONICAL_MICROS.test(value)) {
    throw new AuthorityError(
      "INVALID_INPUT",
      `${field} must be a canonical non-negative integer micro-amount.`,
    );
  }
  return BigInt(value);
}

/**
 * Resolves the keyholders for an action from its material properties.
 *
 * The resolution is a deterministic function of the action alone: nothing here
 * reads which agent proposed it, and anything outside the policy fixture's
 * closed vocabulary fails closed instead of resolving to zero keyholders. An
 * empty result therefore means the policy itself deems the action routine,
 * never that a caller found a shape the policy does not recognize.
 */
export function resolveRequiredRoles(material: MaterialActionProperties): KeyholderResolution {
  const { actionTypes, currencyCodes, rules, policyVersion } = KEYHOLDER_POLICY;
  if (policyVersion !== POLICY_VERSION) {
    throw new AuthorityError(
      "INVALID_INPUT",
      "The keyholder policy fixture does not match the kernel policy version.",
    );
  }
  if (!(actionTypes as readonly string[]).includes(material.actionType)) {
    throw new AuthorityError(
      "INVALID_INPUT",
      "actionType is outside the governed action vocabulary.",
    );
  }
  if (!(currencyCodes as readonly string[]).includes(material.currencyCode)) {
    throw new AuthorityError(
      "INVALID_INPUT",
      "currencyCode is outside the governed currency vocabulary.",
    );
  }
  const budget = parseMicros(material.budgetCapMicros, "budgetCapMicros");
  const matched = rules.filter(
    (rule) =>
      rule.match.actionType === material.actionType &&
      rule.match.currencyCode === material.currencyCode &&
      budget >= parseMicros(rule.match.minBudgetCapMicros, "policy.minBudgetCapMicros"),
  );
  return {
    policyVersion,
    requiredRoles: REQUIRED_ROLES.filter((role) =>
      matched.some((rule) => rule.requiredRoles.includes(role)),
    ),
    matchedRuleIds: matched.map((rule) => rule.ruleId),
  };
}

export function canonicalDigest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new AuthorityError("INVALID_INPUT", "Canonical values must be finite.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    if (entries.some(([, item]) => item === undefined)) {
      throw new AuthorityError("INVALID_INPUT", "Canonical values cannot be undefined.");
    }
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  throw new AuthorityError("INVALID_INPUT", "Unsupported canonical value.");
}

function opaqueId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

function nonce(): string {
  return randomBytes(18).toString("base64url");
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * minute).toISOString();
}

function parseTime(value: string, field: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new AuthorityError("INVALID_INPUT", `${field} must be an RFC3339 timestamp.`);
  }
  return time;
}

function clone(state: DecisionAggregate): DecisionAggregate {
  return structuredClone(state);
}

function assertNoUnreconciledExecution(state: DecisionAggregate): void {
  const receiptLeaseIds = new Set(state.receipts.map((receipt) => receipt.leaseId));
  if (
    state.leases.some(
      (lease) => lease.consumedAt !== null && !receiptLeaseIds.has(lease.leaseId),
    )
  ) {
    throw new AuthorityError(
      "RECONCILIATION_REQUIRED",
      "A consumed execution must be reconciled before the decision can change.",
    );
  }
}

function hashEvidence(bundle: Omit<EvidenceBundle, "hash">): string {
  return canonicalDigest(bundle);
}

function hashAction(
  action: Omit<ActionVersionRecord, "actionHash" | "changedSincePrevious">,
): string {
  return canonicalDigest(action);
}

export function currentAction(state: DecisionAggregate): ActionVersionRecord {
  const action = state.actions.at(-1);
  if (!action) {
    throw new AuthorityError("INVALID_INPUT", "Decision has no action version.");
  }
  return action;
}

export function createInitialDecision(
  now = new Date().toISOString(),
  configuredCampaignSnapshotHash?: string,
): DecisionAggregate {
  parseTime(now, "now");
  if (
    configuredCampaignSnapshotHash !== undefined &&
    !/^sha256:[a-f0-9]{64}$/.test(configuredCampaignSnapshotHash)
  ) {
    throw new AuthorityError(
      "INVALID_INPUT",
      "The configured campaign snapshot hash must be a SHA-256 digest.",
    );
  }

  const evidenceWithoutHash: Omit<EvidenceBundle, "hash"> = {
    schemaVersion: "twokeys.evidence.v1",
    bundleId: `${ACTION_ID}-evidence-v1`,
    facts: {
      "campaign.status": {
        value: "PAUSED",
        sourceId: "google-ads-test-account-snapshot",
        observedAt: now,
      },
      "product.readiness": {
        value: "GREEN",
        sourceId: "product-launch-record-v7",
        observedAt: now,
      },
      "marketing.availableBudgetMicros": {
        value: "84000000000",
        unit: "EUR_MICROS",
        sourceId: "finance-plan-v4",
        observedAt: now,
      },
    },
    assumptions: [
      {
        factId: "assumption.landing_conversion_rate",
        statement: "Landing-page conversion rate is 2.4%.",
        sourceId: "prior-eu-campaign-2026-q1",
      },
    ],
    counterevidence: [
      {
        factId: "counterevidence.august_traffic",
        statement: "August EU sessions are 18% below the Q1 baseline.",
        sourceId: "frozen-analytics-fixture",
      },
      {
        factId: "counterevidence.support_capacity",
        statement: "Two of five planned support roles remain open.",
        sourceId: "frozen-people-fixture",
      },
    ],
  };
  const evidence: EvidenceBundle = {
    ...evidenceWithoutHash,
    hash: hashEvidence(evidenceWithoutHash),
  };

  const campaignSnapshot = {
    resourceRef: "preconfigured-campaign",
    budgetCapMicros: "30000000000",
    currencyCode: "EUR",
    targetScope: "EU",
    conversionGoal: "PURCHASE",
  };
  const businessDecision: ActionVersionRecord["businessDecision"] = {
    budgetCapMicros: "30000000000",
    currencyCode: "EUR",
    startDate: "2026-08-17",
    endDate: "2026-08-30",
    targetScopeDigest: canonicalDigest({ countries: ["DE", "ES", "FR", "IT", "NL"] }),
    conversionGoal: "PURCHASE",
    landingPageDigest: canonicalDigest({ assetRef: "eu-launch-page-v3" }),
  };
  const resolution = resolveRequiredRoles({
    actionType: "google_ads.campaign.activate",
    budgetCapMicros: businessDecision.budgetCapMicros,
    currencyCode: businessDecision.currencyCode,
  });
  const actionWithoutHash: Omit<
    ActionVersionRecord,
    "actionHash" | "changedSincePrevious"
  > = {
    schemaVersion: "twokeys.action.v1",
    actionId: ACTION_ID,
    version: 1,
    actionType: "google_ads.campaign.activate",
    campaign: {
      customerRef: "test-customer",
      resourceRef: "preconfigured-campaign",
      currentStatus: "PAUSED",
      desiredStatus: "ENABLED",
      configurationSnapshotHash:
        configuredCampaignSnapshotHash ?? canonicalDigest(campaignSnapshot),
    },
    businessDecision,
    executionConditions: [],
    evidenceBundleHash: evidence.hash,
    policyVersion: resolution.policyVersion,
    requiredRoles: resolution.requiredRoles,
    createdAt: now,
  };
  const action: ActionVersionRecord = {
    ...actionWithoutHash,
    actionHash: hashAction(actionWithoutHash),
    changedSincePrevious: [],
  };

  return {
    schemaVersion: "twokeys.decision.v1",
    actionId: ACTION_ID,
    evidence,
    actions: [action],
    approvals: [],
    leases: [],
    receipts: [],
    updatedAt: now,
  };
}

export function approvalIsValid(
  approval: ApprovalRecord,
  action: ActionVersionRecord,
  now: string,
): boolean {
  return (
    approval.decision === "APPROVED" &&
    approval.actionVersion === action.version &&
    approval.actionHash === action.actionHash &&
    approval.evidenceBundleHash === action.evidenceBundleHash &&
    approval.policyVersion === action.policyVersion &&
    approval.revokedAt === null &&
    approval.staleAt === null &&
    parseTime(approval.expiresAt, "approval.expiresAt") > parseTime(now, "now")
  );
}

export function approve(
  state: DecisionAggregate,
  role: Role,
  principalId: string,
  now = new Date().toISOString(),
): DecisionAggregate {
  if (!REQUIRED_ROLES.includes(role) || principalId.trim() === "") {
    throw new AuthorityError("INVALID_INPUT", "A known role and principal are required.");
  }
  if (state.receipts.length > 0) {
    throw new AuthorityError("ALREADY_CONFIRMED", "This action is already confirmed.");
  }
  assertNoUnreconciledExecution(state);

  const next = clone(state);
  const action = currentAction(next);
  if (!action.requiredRoles.includes(role)) {
    throw new AuthorityError(
      "ROLE_FORBIDDEN",
      `${role} holds no key for this action; the policy did not resolve it.`,
    );
  }
  const existing = next.approvals.find(
    (item) => item.role === role && approvalIsValid(item, action, now),
  );
  if (existing) {
    if (existing.principalId !== principalId) {
      throw new AuthorityError(
        "ROLE_FORBIDDEN",
        `${role} already has a valid approval from another principal.`,
      );
    }
    return next;
  }

  next.approvals.push({
    approvalId: opaqueId("approval"),
    role,
    principalId,
    actionId: ACTION_ID,
    actionVersion: action.version,
    actionHash: action.actionHash,
    evidenceBundleHash: action.evidenceBundleHash,
    policyVersion: action.policyVersion,
    decision: "APPROVED",
    issuedAt: now,
    expiresAt: addMinutes(now, 30),
    nonce: nonce(),
    revokedAt: null,
    staleAt: null,
  });
  next.updatedAt = now;
  return next;
}

export function addCeoCondition(
  state: DecisionAggregate,
  role: Role,
  executeBefore: string,
  now = new Date().toISOString(),
): DecisionAggregate {
  if (role !== "ceo") {
    throw new AuthorityError("ROLE_FORBIDDEN", "Only the CEO may add this demo condition.");
  }
  if (parseTime(executeBefore, "executeBefore") <= parseTime(now, "now")) {
    throw new AuthorityError("INVALID_INPUT", "The activation deadline must be in the future.");
  }
  if (state.receipts.length > 0) {
    throw new AuthorityError("ALREADY_CONFIRMED", "A confirmed action cannot be changed.");
  }
  assertNoUnreconciledExecution(state);

  const next = clone(state);
  const previous = currentAction(next);
  const conditions: ExecutionCondition[] = [
    {
      type: "product_readiness_equals",
      sourceFactId: "product.readiness",
      expected: "GREEN",
    },
    { type: "execute_before", timestamp: new Date(executeBefore).toISOString() },
  ];
  if (canonicalJson(previous.executionConditions) === canonicalJson(conditions)) {
    return next;
  }

  for (const approval of next.approvals) {
    if (approval.actionVersion === previous.version && approval.staleAt === null) {
      approval.staleAt = now;
    }
  }

  const actionWithoutHash: Omit<
    ActionVersionRecord,
    "actionHash" | "changedSincePrevious"
  > = {
    schemaVersion: previous.schemaVersion,
    actionId: previous.actionId,
    version: previous.version + 1,
    actionType: previous.actionType,
    campaign: previous.campaign,
    businessDecision: previous.businessDecision,
    executionConditions: conditions,
    evidenceBundleHash: previous.evidenceBundleHash,
    policyVersion: previous.policyVersion,
    requiredRoles: previous.requiredRoles,
    createdAt: now,
  };
  next.actions.push({
    ...actionWithoutHash,
    actionHash: hashAction(actionWithoutHash),
    changedSincePrevious: ["executionConditions"],
  });
  next.updatedAt = now;
  return next;
}

function validApprovals(
  state: DecisionAggregate,
  action: ActionVersionRecord,
  now: string,
): ApprovalRecord[] {
  return action.requiredRoles.map((role) => {
    const approval = state.approvals.find(
      (item) => item.role === role && approvalIsValid(item, action, now),
    );
    if (!approval) {
      const expired = state.approvals.some(
        (item) =>
          item.role === role &&
          item.actionVersion === action.version &&
          item.staleAt === null &&
          parseTime(item.expiresAt, "approval.expiresAt") <= parseTime(now, "now"),
      );
      throw new AuthorityError(
        expired ? "APPROVAL_EXPIRED" : "APPROVALS_MISSING",
        `${role} does not have a valid approval for action v${action.version}.`,
      );
    }
    return approval;
  });
}

export function issueLease(
  state: DecisionAggregate,
  now = new Date().toISOString(),
): DecisionAggregate {
  if (state.receipts.length > 0) {
    throw new AuthorityError("ALREADY_CONFIRMED", "This action is already confirmed.");
  }
  assertNoUnreconciledExecution(state);
  const next = clone(state);
  const action = currentAction(next);
  const approvals = validApprovals(next, action, now);
  if (next.leases.some((item) => item.actionVersion === action.version)) {
    throw new AuthorityError(
      "LEASE_EXISTS",
      "This action version already has a lease; reconcile it instead of issuing another.",
    );
  }

  next.leases.push({
    leaseId: opaqueId("lease"),
    actionId: ACTION_ID,
    actionVersion: action.version,
    actionHash: action.actionHash,
    evidenceBundleHash: action.evidenceBundleHash,
    policyVersion: action.policyVersion,
    requiredRoles: [...action.requiredRoles],
    approvalIds: approvals.map((item) => item.approvalId),
    issuedAt: now,
    expiresAt: addMinutes(now, 5),
    nonce: nonce(),
    revokedAt: null,
    consumedAt: null,
  });
  next.updatedAt = now;
  return next;
}

export function revokeLease(
  state: DecisionAggregate,
  leaseId: string,
  now = new Date().toISOString(),
): DecisionAggregate {
  const next = clone(state);
  const lease = next.leases.find((item) => item.leaseId === leaseId);
  if (!lease) {
    throw new AuthorityError("LEASE_NOT_FOUND", "Lease not found.");
  }
  if (lease.consumedAt !== null) {
    throw new AuthorityError("LEASE_CONSUMED", "A consumed lease cannot be revoked.");
  }
  lease.revokedAt ??= now;
  next.updatedAt = now;
  return next;
}

function validateConditions(
  state: DecisionAggregate,
  action: ActionVersionRecord,
  now: string,
): void {
  for (const condition of action.executionConditions) {
    if (condition.type === "product_readiness_equals") {
      if (state.evidence.facts[condition.sourceFactId]?.value !== condition.expected) {
        throw new AuthorityError(
          "CONDITION_FAILED",
          "Product readiness no longer satisfies the approved condition.",
        );
      }
    } else if (parseTime(now, "now") >= parseTime(condition.timestamp, "executeBefore")) {
      throw new AuthorityError(
        "CONDITION_FAILED",
        "The approved activation deadline has passed.",
      );
    }
  }
}

export function validateLease(
  state: DecisionAggregate,
  leaseId: string,
  now = new Date().toISOString(),
): { action: ActionVersionRecord; lease: ActionLeaseRecord } {
  const action = currentAction(state);
  const lease = state.leases.find((item) => item.leaseId === leaseId);
  if (!lease) {
    throw new AuthorityError("LEASE_NOT_FOUND", "Lease not found.");
  }
  if (lease.consumedAt !== null) {
    throw new AuthorityError("LEASE_CONSUMED", "Lease replay denied before execution.");
  }
  if (lease.revokedAt !== null) {
    throw new AuthorityError("LEASE_REVOKED", "Revoked lease denied before execution.");
  }
  if (parseTime(lease.expiresAt, "lease.expiresAt") <= parseTime(now, "now")) {
    throw new AuthorityError("LEASE_EXPIRED", "Expired lease denied before execution.");
  }
  if (
    lease.actionVersion !== action.version ||
    lease.actionHash !== action.actionHash ||
    lease.evidenceBundleHash !== action.evidenceBundleHash ||
    lease.policyVersion !== action.policyVersion
  ) {
    throw new AuthorityError("HASH_MISMATCH", "Lease does not match the current action.");
  }
  validApprovals(state, action, now);
  validateConditions(state, action, now);
  return { action, lease };
}

export function consumeLease(
  state: DecisionAggregate,
  leaseId: string,
  observedSnapshotHash: string,
  now = new Date().toISOString(),
): DecisionAggregate {
  const { action } = validateLease(state, leaseId, now);
  if (observedSnapshotHash !== action.campaign.configurationSnapshotHash) {
    throw new AuthorityError(
      "SNAPSHOT_DRIFT",
      "The live campaign snapshot differs from the approved configuration.",
    );
  }

  const next = clone(state);
  const lease = next.leases.find((item) => item.leaseId === leaseId)!;
  lease.consumedAt = now;
  next.updatedAt = now;
  return next;
}

export function recordReceipt(
  state: DecisionAggregate,
  input: {
    leaseId: string;
    resourceName: string;
    requestId: string | null;
    requestedAt: string;
    observedAt: string;
    observedStatus: CampaignStatus;
  },
): DecisionAggregate {
  const next = clone(state);
  const lease = next.leases.find((item) => item.leaseId === input.leaseId);
  if (!lease || lease.consumedAt === null) {
    throw new AuthorityError(
      "LEASE_NOT_FOUND",
      "A consumed lease is required before recording a receipt.",
    );
  }
  const action = currentAction(next);
  if (lease.actionVersion !== action.version || lease.actionHash !== action.actionHash) {
    throw new AuthorityError(
      "HASH_MISMATCH",
      "The consumed lease does not match the current action.",
    );
  }
  if (input.observedStatus !== "ENABLED") {
    throw new AuthorityError(
      "EXTERNAL_UNCONFIRMED",
      "Google Ads read-back did not confirm ENABLED.",
    );
  }
  const existing = next.receipts.find((item) => item.leaseId === input.leaseId);
  if (existing) {
    return next;
  }

  next.receipts.push({
    receiptId: opaqueId("receipt"),
    leaseId: lease.leaseId,
    actionHash: lease.actionHash,
    provider: "google_ads",
    environment: "test_account",
    operation: "campaign.status:PAUSED->ENABLED",
    resourceName: input.resourceName,
    requestId: input.requestId,
    requestedAt: input.requestedAt,
    observedAt: input.observedAt,
    observedStatus: "ENABLED",
    result: "CONFIRMED",
  });
  next.updatedAt = input.observedAt;
  return next;
}

export type DecisionStatus =
  | "PENDING_KEYS"
  | "PARTIALLY_APPROVED"
  | "STALE"
  | "FULLY_APPROVED"
  | "LEASED"
  | "CONSUMED"
  | "CONFIRMED";

export function decisionStatus(
  state: DecisionAggregate,
  now = new Date().toISOString(),
): DecisionStatus {
  if (state.receipts.length > 0) return "CONFIRMED";
  const action = currentAction(state);
  const lease = state.leases.find((item) => item.actionVersion === action.version);
  if (lease?.consumedAt) return "CONSUMED";
  if (lease && !lease.revokedAt && parseTime(lease.expiresAt, "lease.expiresAt") > parseTime(now, "now")) {
    return "LEASED";
  }
  const count = action.requiredRoles.filter((role) =>
    state.approvals.some(
      (item) => item.role === role && approvalIsValid(item, action, now),
    ),
  ).length;
  if (count === action.requiredRoles.length) return "FULLY_APPROVED";
  if (count > 0) return "PARTIALLY_APPROVED";
  if (state.approvals.some((item) => item.staleAt !== null)) return "STALE";
  return "PENDING_KEYS";
}
