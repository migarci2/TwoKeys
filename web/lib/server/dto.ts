import { SURFACES } from "../fixture.ts";
import {
  approvalIsValid,
  currentAction,
  decisionStatus,
  type DecisionAggregate,
  type Role,
} from "./authority.ts";

export function decisionView(
  state: DecisionAggregate,
  viewerRole: Role,
  now = new Date().toISOString(),
) {
  const action = currentAction(state);
  const approvals = action.requiredRoles.map((role) => {
    const current = state.approvals.find(
      (item) => item.role === role && approvalIsValid(item, action, now),
    );
    const stale = [...state.approvals]
      .reverse()
      .find((item) => item.role === role && item.staleAt !== null);
    return {
      role,
      status: current ? ("APPROVED" as const) : stale ? ("STALE" as const) : ("PENDING" as const),
      actionVersion: current?.actionVersion ?? stale?.actionVersion ?? action.version,
      issuedAt: current?.issuedAt ?? stale?.issuedAt ?? null,
    };
  });
  const lease = state.leases.find((item) => item.actionVersion === action.version);
  const receipt = state.receipts.at(-1);

  return {
    actionId: state.actionId,
    viewerRole,
    status: decisionStatus(state, now),
    action: {
      version: action.version,
      actionType: action.actionType,
      actionHash: action.actionHash,
      evidenceBundleHash: action.evidenceBundleHash,
      policyVersion: action.policyVersion,
      campaign: action.campaign,
      businessDecision: action.businessDecision,
      executionConditions: action.executionConditions,
      requiredRoles: action.requiredRoles,
      changedSincePrevious: action.changedSincePrevious,
    },
    evidence: state.evidence,
    approvals,
    lease: lease
      ? {
          leaseId: lease.leaseId,
          issuedAt: lease.issuedAt,
          expiresAt: lease.expiresAt,
          revokedAt: lease.revokedAt,
          consumedAt: lease.consumedAt,
          singleUse: true as const,
        }
      : null,
    receipt: receipt
      ? {
          receiptId: receipt.receiptId,
          leaseId: receipt.leaseId,
          actionHash: receipt.actionHash,
          environment: receipt.environment,
          operation: receipt.operation,
          resourceName: receipt.resourceName,
          requestId: receipt.requestId,
          observedAt: receipt.observedAt,
          observedStatus: receipt.observedStatus,
          result: receipt.result,
        }
      : null,
    surface: SURFACES[viewerRole],
    labels: {
      businessData: "SYNTHETIC BUSINESS DATA",
      externalSystem: "GOOGLE ADS TEST ACCOUNT: NO LIVE ADS OR SPEND",
    },
  };
}

export type DecisionView = ReturnType<typeof decisionView>;
