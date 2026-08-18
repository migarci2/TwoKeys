import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthorityError,
  addCeoCondition,
  approve,
  consumeLease,
  createInitialDecision,
  currentAction,
  decisionStatus,
  issueLease,
  recordReceipt,
  revokeLease,
  type DecisionAggregate,
} from "./authority.ts";

const T0 = "2026-08-14T09:00:00.000Z";
const T1 = "2026-08-14T09:01:00.000Z";
const T2 = "2026-08-14T09:02:00.000Z";
const T3 = "2026-08-14T09:03:00.000Z";
const DEADLINE = "2026-08-17T08:00:00.000Z";

function expectDenied(code: AuthorityError["code"], run: () => unknown): void {
  assert.throws(run, (error) => error instanceof AuthorityError && error.code === code);
}

function v2WithApprovals(): DecisionAggregate {
  let state = createInitialDecision(T0);
  state = approve(state, "finance", "finance@example.test", T1);
  state = addCeoCondition(state, "ceo", DEADLINE, T2);
  state = approve(state, "finance", "finance@example.test", T2);
  state = approve(state, "ceo", "ceo@example.test", T3);
  return state;
}

test("A1: no approvals causes zero executor calls", () => {
  const state = createInitialDecision(T0);
  const executorCalls = 0;
  expectDenied("APPROVALS_MISSING", () => issueLease(state, T1));
  assert.equal(executorCalls, 0);
  assert.equal(decisionStatus(state, T1), "PENDING_KEYS");
});

test("A2: Finance only causes zero executor calls", () => {
  const state = approve(createInitialDecision(T0), "finance", "finance@example.test", T1);
  const executorCalls = 0;
  expectDenied("APPROVALS_MISSING", () => issueLease(state, T2));
  assert.equal(executorCalls, 0);
  assert.equal(decisionStatus(state, T2), "PARTIALLY_APPROVED");
});

test("A3: CEO only causes zero executor calls", () => {
  const state = approve(createInitialDecision(T0), "ceo", "ceo@example.test", T1);
  const executorCalls = 0;
  expectDenied("APPROVALS_MISSING", () => issueLease(state, T2));
  assert.equal(executorCalls, 0);
});

test("A4: Finance v1 and CEO v2 cannot issue a lease", () => {
  let state = createInitialDecision(T0);
  state = approve(state, "finance", "finance@example.test", T1);
  state = addCeoCondition(state, "ceo", DEADLINE, T2);
  state = approve(state, "ceo", "ceo@example.test", T3);
  const executorCalls = 0;
  expectDenied("APPROVALS_MISSING", () => issueLease(state, T3));
  assert.equal(executorCalls, 0);
});

test("A5: a material CEO condition creates v2 and stales Finance v1", () => {
  let state = createInitialDecision(T0);
  const v1Hash = currentAction(state).actionHash;
  state = approve(state, "finance", "finance@example.test", T1);
  state = addCeoCondition(state, "ceo", DEADLINE, T2);

  assert.equal(currentAction(state).version, 2);
  assert.notEqual(currentAction(state).actionHash, v1Hash);
  assert.deepEqual(currentAction(state).changedSincePrevious, ["executionConditions"]);
  assert.equal(state.approvals[0]?.staleAt, T2);
  assert.equal(state.leases.length, 0);
  assert.equal(decisionStatus(state, T2), "STALE");
});

test("A6: matching v2 approvals produce one mutation and one receipt", () => {
  let state = issueLease(v2WithApprovals(), T3);
  const lease = state.leases.at(-1)!;
  let executorCalls = 0;

  state = consumeLease(
    state,
    lease.leaseId,
    currentAction(state).campaign.configurationSnapshotHash,
    "2026-08-14T09:03:01.000Z",
  );
  executorCalls += 1;
  state = recordReceipt(state, {
    leaseId: lease.leaseId,
    resourceName: "customers/redacted/campaigns/redacted",
    requestId: "request-1",
    requestedAt: "2026-08-14T09:03:01.000Z",
    observedAt: "2026-08-14T09:03:02.000Z",
    observedStatus: "ENABLED",
  });

  assert.equal(executorCalls, 1);
  assert.equal(state.receipts.length, 1);
  assert.equal(decisionStatus(state), "CONFIRMED");
});

test("A7: replay is denied before a second executor call", () => {
  let state = issueLease(v2WithApprovals(), T3);
  const lease = state.leases.at(-1)!;
  const snapshot = currentAction(state).campaign.configurationSnapshotHash;
  let executorCalls = 0;
  state = consumeLease(state, lease.leaseId, snapshot, "2026-08-14T09:03:01.000Z");
  executorCalls += 1;

  expectDenied("LEASE_CONSUMED", () =>
    consumeLease(state, lease.leaseId, snapshot, "2026-08-14T09:03:02.000Z"),
  );
  assert.equal(executorCalls, 1);
});

test("A8: an expired lease is denied before execution", () => {
  const state = issueLease(v2WithApprovals(), T3);
  const lease = state.leases.at(-1)!;
  const executorCalls = 0;
  expectDenied("LEASE_EXPIRED", () =>
    consumeLease(
      state,
      lease.leaseId,
      currentAction(state).campaign.configurationSnapshotHash,
      "2026-08-14T09:09:00.000Z",
    ),
  );
  assert.equal(executorCalls, 0);
});

test("A9: a revoked lease is denied before execution", () => {
  let state = issueLease(v2WithApprovals(), T3);
  const lease = state.leases.at(-1)!;
  state = revokeLease(state, lease.leaseId, "2026-08-14T09:03:01.000Z");
  const executorCalls = 0;
  expectDenied("LEASE_REVOKED", () =>
    consumeLease(
      state,
      lease.leaseId,
      currentAction(state).campaign.configurationSnapshotHash,
      "2026-08-14T09:03:02.000Z",
    ),
  );
  assert.equal(executorCalls, 0);
});

test("canonical hashes are deterministic and omit private approval data", () => {
  const one = createInitialDecision(T0);
  const two = createInitialDecision(T0);
  assert.equal(currentAction(one).actionHash, currentAction(two).actionHash);
  assert.equal(one.evidence.hash, two.evidence.hash);

  const approved = approve(one, "finance", "private-principal", T1);
  assert.equal(currentAction(approved).actionHash, currentAction(two).actionHash);
});

test("snapshot drift and failed conditions fail closed", () => {
  const leased = issueLease(v2WithApprovals(), T3);
  const lease = leased.leases.at(-1)!;
  expectDenied("SNAPSHOT_DRIFT", () =>
    consumeLease(leased, lease.leaseId, "sha256:drifted", T3),
  );

  const changedEvidence = structuredClone(leased);
  changedEvidence.evidence.facts["product.readiness"]!.value = "RED";
  expectDenied("CONDITION_FAILED", () =>
    consumeLease(
      changedEvidence,
      lease.leaseId,
      currentAction(changedEvidence).campaign.configurationSnapshotHash,
      T3,
    ),
  );
});
