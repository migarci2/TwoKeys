import {
  AuthorityError,
  consumeLease,
  currentAction,
  decisionStatus,
  issueLease,
  recordReceipt,
  validateLease,
} from "./authority.ts";
import type { CampaignGateway } from "./executor.ts";
import type { DecisionStore } from "./store.ts";

export async function executeCurrentDecision(
  store: DecisionStore,
  gateway: CampaignGateway,
  clock: () => string = () => new Date().toISOString(),
) {
  const initial = await store.read(clock());
  const action = currentAction(initial);
  const lease = [...initial.leases]
    .reverse()
    .find((item) => item.actionVersion === action.version);
  if (!lease) {
    throw new AuthorityError("LEASE_NOT_FOUND", "Issue a valid lease before execution.");
  }

  validateLease(initial, lease.leaseId, clock());
  const before = await gateway.read(action);
  if (before.status !== action.campaign.currentStatus) {
    throw new AuthorityError(
      "SNAPSHOT_DRIFT",
      `Expected ${action.campaign.currentStatus}, observed ${before.status}.`,
    );
  }

  const requestedAt = clock();
  await store.update(
    (state) =>
      consumeLease(state, lease.leaseId, before.configurationSnapshotHash, requestedAt),
    requestedAt,
  );

  // Consumption is committed before this call. A provider failure requires
  // reconciliation and can never turn into a blind replay.
  const mutation = await gateway.enable(action);
  const after = await gateway.read(action);
  if (after.configurationSnapshotHash !== action.campaign.configurationSnapshotHash) {
    throw new AuthorityError(
      "SNAPSHOT_DRIFT",
      "Google Ads configuration drifted during execution; receipt withheld.",
    );
  }
  if (after.status !== action.campaign.desiredStatus) {
    throw new AuthorityError(
      "EXTERNAL_UNCONFIRMED",
      `Google Ads read-back observed ${after.status}, not ${action.campaign.desiredStatus}.`,
    );
  }

  const observedAt = clock();
  return store.update(
    (state) =>
      recordReceipt(state, {
        leaseId: lease.leaseId,
        resourceName: after.resourceName,
        requestId: mutation.requestId,
        requestedAt,
        observedAt,
        observedStatus: after.status,
      }),
    observedAt,
  );
}

export async function reconcileCurrentDecision(
  store: DecisionStore,
  gateway: CampaignGateway,
  clock: () => string = () => new Date().toISOString(),
) {
  const state = await store.read(clock());
  if (state.receipts.length > 0) return state;
  const action = currentAction(state);
  const lease = [...state.leases]
    .reverse()
    .find((item) => item.actionVersion === action.version && item.consumedAt !== null);
  if (!lease) {
    throw new AuthorityError("LEASE_NOT_FOUND", "No consumed lease requires reconciliation.");
  }
  const observed = await gateway.read(action);
  if (observed.configurationSnapshotHash !== action.campaign.configurationSnapshotHash) {
    throw new AuthorityError(
      "SNAPSHOT_DRIFT",
      "Reconciliation found a different Google Ads configuration.",
    );
  }
  if (observed.status !== action.campaign.desiredStatus) {
    throw new AuthorityError(
      "EXTERNAL_UNCONFIRMED",
      "Reconciliation did not observe the approved Google Ads status; no retry was attempted.",
    );
  }
  const observedAt = clock();
  return store.update(
    (current) =>
      recordReceipt(current, {
        leaseId: lease.leaseId,
        resourceName: observed.resourceName,
        requestId: null,
        requestedAt: lease.consumedAt!,
        observedAt,
        observedStatus: observed.status,
      }),
    observedAt,
  );
}

/**
 * Completes the non-human part of the workflow. Human approvals are the only
 * deliberate pauses; lease issue, provider mutation and safe reconciliation
 * continue automatically once the matching keys exist.
 */
export async function settleCurrentDecision(
  store: DecisionStore,
  gateway: CampaignGateway,
  clock: () => string = () => new Date().toISOString(),
) {
  let state = await store.read(clock());
  let status = decisionStatus(state, clock());
  if (status === "FULLY_APPROVED") {
    const now = clock();
    state = await store.update((current) => issueLease(current, now), now);
    status = decisionStatus(state, clock());
  }
  if (status === "LEASED") return executeCurrentDecision(store, gateway, clock);
  if (status === "CONSUMED") return reconcileCurrentDecision(store, gateway, clock);
  return state;
}
