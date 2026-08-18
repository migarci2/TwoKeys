/**
 * The frozen `launch-eu-001` fixture.
 *
 * Every number on the landing page comes from here, so nothing on the page is
 * invented at render time. The company, people and business metrics are
 * synthetic; only the Google Ads mutation in the demo is real, and it targets a
 * test account that cannot bill or serve.
 *
 * Source of truth: docs/02-demo/scenario.md
 */

import type {
  ActionVersion,
  Approval,
  BudgetBar,
  DenialCase,
  EvidenceItem,
  Lease,
  Receipt,
  RoleSurface,
  ScenarioRow,
} from "./types";

export const FIXTURE_ID = "launch-eu-001";
export const POLICY_VERSION = "policy-2026.08.1";

/** Synthetic company policy that makes this decision a two-key decision. */
export const POLICY_RULE =
  "A new launch campaign with a total business budget of at least EUR 25,000 requires Finance and CEO approval on the same action version.";

export const ACTION_V1: ActionVersion = {
  version: 1,
  actionHash: "a41c7e02",
  evidenceHash: "e7f39b14",
  policyVersion: POLICY_VERSION,
  campaignResource: "customers/4417029358/campaigns/20918447326",
  desiredState: "ENABLED",
  budgetCapEur: 30000,
  periodDays: 14,
  requiredKeys: ["finance", "ceo"],
  condition: null,
  changedSincePrevious: [],
};

export const ACTION_V2: ActionVersion = {
  version: 2,
  actionHash: "b93d5a77",
  evidenceHash: "e7f39b14",
  policyVersion: POLICY_VERSION,
  campaignResource: "customers/4417029358/campaigns/20918447326",
  desiredState: "ENABLED",
  budgetCapEur: 30000,
  periodDays: 14,
  requiredKeys: ["finance", "ceo"],
  condition:
    "Activate only while Product readiness is GREEN and before the declared launch activation deadline. Otherwise require new approval.",
  changedSincePrevious: ["execution_condition"],
};

/** Approval state at each beat of episode 1. */
export const APPROVALS_V1_PARTIAL: Approval[] = [
  {
    role: "finance",
    status: "APPROVED",
    actionVersion: 1,
    actionHash: ACTION_V1.actionHash,
    evidenceHash: ACTION_V1.evidenceHash,
    at: "2026-08-13T09:41:02Z",
  },
  {
    role: "ceo",
    status: "PENDING",
    actionVersion: 1,
    actionHash: ACTION_V1.actionHash,
    evidenceHash: ACTION_V1.evidenceHash,
    at: null,
  },
];

export const APPROVALS_V2_STALE: Approval[] = [
  {
    role: "finance",
    status: "STALE",
    actionVersion: 1,
    actionHash: ACTION_V1.actionHash,
    evidenceHash: ACTION_V1.evidenceHash,
    at: "2026-08-13T09:41:02Z",
  },
  {
    role: "ceo",
    status: "PENDING",
    actionVersion: 2,
    actionHash: ACTION_V2.actionHash,
    evidenceHash: ACTION_V2.evidenceHash,
    at: null,
  },
];

export const APPROVALS_V2_COMPLETE: Approval[] = [
  {
    role: "finance",
    status: "APPROVED",
    actionVersion: 2,
    actionHash: ACTION_V2.actionHash,
    evidenceHash: ACTION_V2.evidenceHash,
    at: "2026-08-13T09:48:55Z",
  },
  {
    role: "ceo",
    status: "APPROVED",
    actionVersion: 2,
    actionHash: ACTION_V2.actionHash,
    evidenceHash: ACTION_V2.evidenceHash,
    at: "2026-08-13T09:49:31Z",
  },
];

export const EVIDENCE: EvidenceItem[] = [
  {
    factId: "f.campaign.state",
    label: "Campaign current state",
    value: "PAUSED",
    source: "google-ads:test-account read-back",
    observedAt: "2026-08-13T09:38:10Z",
    kind: "fact",
  },
  {
    factId: "f.product.readiness",
    label: "Product readiness",
    value: "GREEN",
    source: "frozen Product record",
    observedAt: "2026-08-12T17:02:00Z",
    kind: "fact",
  },
  {
    factId: "f.budget.remaining",
    label: "Unallocated Q3 marketing budget",
    value: "EUR 84,000",
    source: "frozen finance fixture",
    observedAt: "2026-08-12T23:59:00Z",
    kind: "fact",
  },
  {
    factId: "f.assume.cvr",
    label: "Assumed landing-page conversion rate",
    value: "2.4%",
    source: "prior EU campaign, 2026-Q1",
    observedAt: "2026-04-30T00:00:00Z",
    kind: "assumption",
  },
  {
    factId: "f.counter.seasonality",
    label: "August EU traffic runs below Q1 baseline",
    value: "-18% sessions",
    source: "frozen analytics fixture",
    observedAt: "2026-08-01T00:00:00Z",
    kind: "counterevidence",
  },
  {
    factId: "f.counter.support",
    label: "Support headcount is not scaled for launch volume",
    value: "2 of 5 roles open",
    source: "frozen people fixture",
    observedAt: "2026-08-11T09:00:00Z",
    kind: "counterevidence",
  },
];

export const BUDGET_BARS: BudgetBar[] = [
  { label: "Committed Q3", amountEur: 116000, kind: "committed" },
  { label: "This campaign", amountEur: 30000, kind: "proposed" },
  { label: "Remaining after", amountEur: 54000, kind: "remaining" },
];

export const SCENARIOS: ScenarioRow[] = [
  {
    name: "Full launch, 14 days",
    upsideEur: 96000,
    downsideEur: -30000,
    reversible: false,
    note: "Proposed action. Full cap committed up front.",
  },
  {
    name: "Reversible pilot, 4 days",
    upsideEur: 24000,
    downsideEur: -8600,
    reversible: true,
    note: "Smallest action that still tests the EU demand signal.",
  },
  {
    name: "Defer to September",
    upsideEur: 71000,
    downsideEur: 0,
    reversible: true,
    note: "Avoids the August traffic dip; concedes first-mover window.",
  },
];

export const LEASE: Lease = {
  id: "lease_01K3F7QW2C",
  nonce: "n_7c41ab90e5",
  issuedAt: "2026-08-13T09:49:33Z",
  expiresAt: "2026-08-13T09:54:33Z",
  singleUse: true,
  consumedAt: "2026-08-13T09:49:41Z",
};

export const RECEIPT: Receipt = {
  resourceName: ACTION_V2.campaignResource,
  requestId: "req_9Hy2LcQ0",
  observedStateBefore: "PAUSED",
  observedStateAfter: "ENABLED",
  readBackAt: "2026-08-13T09:49:42Z",
  actionHash: ACTION_V2.actionHash,
};

/** Every way the gate refuses. All of these fail closed. */
export const DENIALS: DenialCase[] = [
  {
    code: "LEASE_CONSUMED",
    label: "Replay",
    why: "The lease was already spent. A second executor call never happens.",
  },
  {
    code: "LEASE_EXPIRED",
    label: "Expiry",
    why: "Authority is time-bound. Past the window the permit is dead.",
  },
  {
    code: "LEASE_REVOKED",
    label: "Revocation",
    why: "Either keyholder can withdraw before execution.",
  },
  {
    code: "APPROVAL_STALE",
    label: "Stale consent",
    why: "An approval bound to v1 cannot authorize v2.",
  },
  {
    code: "HASH_MISMATCH",
    label: "Hash mismatch",
    why: "Action, evidence or policy hash moved since approval.",
  },
  {
    code: "SNAPSHOT_DRIFT",
    label: "Snapshot drift",
    why: "The live campaign no longer matches the approved configuration.",
  },
];

/** How the same decision is sequenced for each role. Same facts, different order. */
export const SURFACES: Record<"finance" | "ceo", RoleSurface> = {
  finance: {
    role: "finance",
    owns: "Affordability, budget impact, downside, guardrails",
    modules: [
      "ActionCapsule",
      "BudgetWaterfall",
      "MetricStrip",
      "EvidenceList",
    ],
    lead: "EUR 30,000 against EUR 84,000 unallocated. Two counterevidence items open.",
  },
  ceo: {
    role: "ceo",
    owns: "Strategic priority, urgency, opportunity cost",
    modules: ["ActionCapsule", "MetricStrip", "ScenarioTable", "EvidenceList"],
    lead: "First-mover window in EU against an August traffic dip. One reversible alternative.",
  },
};

/** Episode 2: the same later decision rendered with CEO memory off and on. */
export const EPISODE_2 = {
  feedback:
    "For launch decisions above EUR 20,000, show me the smallest reversible pilot and its opportunity cost before the full upside.",
  budgetCapEur: 25000,
  rows: [
    {
      surface: "CEO",
      off: "Strategy summary first",
      on: "Reversible pilot and opportunity cost first",
      changed: true,
    },
    {
      surface: "Finance",
      off: "Budget view first",
      on: "Budget view first",
      changed: false,
    },
    {
      surface: "Shared evidence",
      off: "e7f39b14",
      on: "e7f39b14",
      changed: false,
    },
    {
      surface: "Required keys",
      off: "Finance + CEO",
      on: "Finance + CEO",
      changed: false,
    },
    {
      surface: "Policy",
      off: POLICY_VERSION,
      on: POLICY_VERSION,
      changed: false,
    },
  ],
} as const;

/** The seven components, in request order. */
export const ARCHITECTURE = [
  {
    n: 1,
    name: "Revenue Watcher",
    does: "Reads the frozen fixture and proposes facts with source IDs. Approves nothing.",
    trust: "untrusted",
  },
  {
    n: 2,
    name: "Decision Kernel",
    does: "Calculations, policy, canonicalization, material diff, hashes, approval validity.",
    trust: "deterministic",
  },
  {
    n: 3,
    name: "Firestore State",
    does: "Shared evidence, action versions, per-role memory, approvals, leases, receipts.",
    trust: "deterministic",
  },
  {
    n: 4,
    name: "Role Surface Generator",
    does: "Two isolated model calls select and order allowlisted components over server-owned data refs.",
    trust: "untrusted",
  },
  {
    n: 5,
    name: "Trusted Renderer",
    does: "Schema validation, authentication, deterministic capsule, approval endpoints.",
    trust: "deterministic",
  },
  {
    n: 6,
    name: "Lease Gate + Executor",
    does: "Revalidates authority, consumes one lease atomically, performs the single mutation.",
    trust: "deterministic",
  },
  {
    n: 7,
    name: "Receipt + Harness",
    does: "Stores external result metadata and runs the authority, privacy and adaptation fixtures.",
    trust: "deterministic",
  },
] as const;

export const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
