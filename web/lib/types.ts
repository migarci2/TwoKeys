/**
 * Shared TwoKeys domain types.
 *
 * The landing page and the demo app render the same components off these
 * types. On the landing they are fed by the frozen `launch-eu-001` fixture;
 * in the demo they will be fed by the Decision Kernel over the wire. Keep
 * this file free of presentation concerns.
 */

export type Role = "finance" | "ceo";

/** Authority state of a decision, in the order the demo walks through them. */
export type AuthorityState =
  "BLOCKED" | "PARTIAL" | "STALE" | "AUTHORIZED" | "CONSUMED" | "DENIED";

export type CampaignState = "PAUSED" | "ENABLED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "STALE";

export interface Approval {
  role: Role;
  status: ApprovalStatus;
  /** Action version this approval was bound to. Never inherited by a later version. */
  actionVersion: number;
  actionHash: string;
  evidenceHash: string;
  at: string | null;
}

export interface ActionVersion {
  version: number;
  actionHash: string;
  evidenceHash: string;
  policyVersion: string;
  campaignResource: string;
  desiredState: CampaignState;
  budgetCapEur: number;
  periodDays: number;
  requiredKeys: Role[];
  /** Closed-vocabulary execution precondition, empty on v1. */
  condition: string | null;
  /** Material fields that differ from the previous version. */
  changedSincePrevious: string[];
}

export interface EvidenceItem {
  factId: string;
  label: string;
  value: string;
  source: string;
  observedAt: string;
  /** Counterevidence and downside are mandatory slots, never optional. */
  kind: "fact" | "assumption" | "counterevidence";
}

export interface ScenarioRow {
  name: string;
  upsideEur: number;
  downsideEur: number;
  reversible: boolean;
  note: string;
}

export interface BudgetBar {
  label: string;
  amountEur: number;
  kind: "committed" | "proposed" | "remaining";
}

export interface Lease {
  id: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  singleUse: true;
  consumedAt: string | null;
}

export interface Receipt {
  resourceName: string;
  requestId: string;
  observedStateBefore: CampaignState;
  observedStateAfter: CampaignState;
  readBackAt: string;
  actionHash: string;
}

export interface DenialCase {
  code: string;
  label: string;
  why: string;
}

/** One surface module, chosen and ordered by the model from a fixed catalog. */
export type SurfaceModule =
  | "ActionCapsule"
  | "MetricStrip"
  | "BudgetWaterfall"
  | "ScenarioTable"
  | "EvidenceList"
  | "ConditionForm";

export interface RoleSurface {
  role: Role;
  /** Human label for the role's ownership, shown above the surface. */
  owns: string;
  /** Module order for this role. The catalog is fixed; only order and depth vary. */
  modules: SurfaceModule[];
  /** The one line the surface leads with. */
  lead: string;
}

export interface GeneratedSurfaceResponse {
  surface: RoleSurface;
  a2ui: Array<Record<string, unknown>>;
  bindings: {
    actionHash: string;
    evidenceHash: string;
    policyVersion: string;
  };
  generator: {
    source: "gemini" | "fallback";
    modelId: string;
    thinkingLevel: "low";
    promptVersion: string;
    a2uiVersion: string;
    catalogVersion: string;
    memoryApplied: boolean;
  };
}

export interface SurfaceComparisonResponse {
  control: GeneratedSurfaceResponse;
  treatment: GeneratedSurfaceResponse;
  unchanged: { evidenceHash: boolean; policyVersion: boolean };
}
