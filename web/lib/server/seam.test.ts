import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthorityError,
  addCeoCondition,
  approve,
  issueLease,
} from "./authority.ts";
import { MemoryProposalStore } from "./proposal-store.ts";
import {
  awaitDecisionSeam,
  createProposal,
  issueProposalLease,
  proposeActionSeam,
  type SeamStores,
} from "./seam.ts";
import { MemoryDecisionStore } from "./store.ts";

const T0 = "2026-08-14T09:00:00.000Z";
const T1 = "2026-08-14T09:01:00.000Z";
const DEADLINE = "2026-08-17T08:00:00.000Z";

function proposalPayload(budgetCapMicros: string, proposedBy = "revenue-agent") {
  return {
    action: {
      actionType: "google_ads.campaign.activate",
      campaign: {
        customerRef: "test-customer",
        resourceRef: "preconfigured-campaign",
        desiredStatus: "ENABLED",
      },
      businessDecision: {
        budgetCapMicros,
        currencyCode: "EUR",
        startDate: "2026-08-17",
        endDate: "2026-08-30",
      },
    },
    evidence: {
      "product.readiness": {
        value: "GREEN",
        sourceId: "product-launch-record-v7",
        observedAt: T0,
      },
    },
    proposedBy,
  };
}

function stores(): SeamStores {
  return { decisions: new MemoryDecisionStore(), proposals: new MemoryProposalStore() };
}

function expectDenied(code: AuthorityError["code"], run: () => unknown): void {
  assert.throws(run, (error) => error instanceof AuthorityError && error.code === code);
}

test("S1: a low-stakes action resolves to zero keyholders and is authorized on proposal", async () => {
  const seam = stores();
  const view = await proposeActionSeam(seam, proposalPayload("9000000000"), T0);

  assert.equal(view.state, "AUTHORIZED");
  assert.deepEqual(view.requiredRoles, []);
  if (view.state !== "AUTHORIZED") return;
  assert.equal(view.lease.singleUse, true);
  assert.deepEqual(view.lease.approvalIds, []);
  assert.equal(view.lease.actionHash, view.proposedActionHash);

  // No human record exists anywhere: the governed decision saw no approvals.
  const governed = await seam.decisions.read(T0);
  assert.equal(governed.approvals.length, 0);
  assert.equal(governed.leases.length, 0);

  // The authorization is recorded in the proposal's audit trail.
  const stored = await seam.proposals.read(view.decisionId);
  assert.ok(stored);
  assert.deepEqual(
    stored.audit.map((entry) => entry.event),
    ["PROPOSED", "AUTHORIZED_ZERO_KEYHOLDERS", "LEASE_ISSUED"],
  );
});

test("S2: a material action returns PENDING with the resolved keyholders and no lease", async () => {
  const seam = stores();
  const view = await proposeActionSeam(seam, proposalPayload("30000000000"), T0);

  assert.equal(view.state, "PENDING");
  assert.deepEqual(view.requiredRoles, ["finance", "ceo"]);
  if (view.state !== "PENDING") return;
  assert.deepEqual(
    view.approvals,
    [
      { role: "finance", status: "PENDING" },
      { role: "ceo", status: "PENDING" },
    ],
  );

  const awaited = await awaitDecisionSeam(seam, view.decisionId, T1);
  assert.equal(awaited.state, "PENDING");
});

test("S3: resolution is agent-independent", async () => {
  const seam = stores();
  const one = await proposeActionSeam(seam, proposalPayload("30000000000", "agent-a"), T0);
  const two = await proposeActionSeam(seam, proposalPayload("30000000000", "agent-b"), T0);
  assert.deepEqual(one.requiredRoles, two.requiredRoles);
  assert.equal(one.proposedActionHash, two.proposedActionHash);
  assert.equal(one.state, two.state);
});

test("S4: a pending proposal is authorized only after every keyholder approves and the kernel leases", async () => {
  const seam = stores();
  const view = await proposeActionSeam(seam, proposalPayload("30000000000"), T0);
  assert.equal(view.state, "PENDING");

  await seam.decisions.update((state) => approve(state, "finance", "finance", T1), T1);
  let awaited = await awaitDecisionSeam(seam, view.decisionId, T1);
  assert.equal(awaited.state, "PENDING");
  if (awaited.state === "PENDING") {
    assert.deepEqual(
      awaited.approvals,
      [
        { role: "finance", status: "APPROVED" },
        { role: "ceo", status: "PENDING" },
      ],
    );
  }

  // A material CEO condition stales Finance; the seam keeps reporting PENDING.
  await seam.decisions.update(
    (state) => addCeoCondition(state, "ceo", DEADLINE, "2026-08-14T09:02:00.000Z"),
  );
  awaited = await awaitDecisionSeam(seam, view.decisionId, "2026-08-14T09:02:30.000Z");
  assert.equal(awaited.state, "PENDING");

  await seam.decisions.update((state) => approve(state, "finance", "finance", "2026-08-14T09:03:00.000Z"));
  await seam.decisions.update((state) => approve(state, "ceo", "ceo", "2026-08-14T09:03:30.000Z"));
  await seam.decisions.update((state) => issueLease(state, "2026-08-14T09:04:00.000Z"));

  awaited = await awaitDecisionSeam(seam, view.decisionId, "2026-08-14T09:04:30.000Z");
  assert.equal(awaited.state, "AUTHORIZED");
  if (awaited.state === "AUTHORIZED") {
    assert.equal(awaited.lease.approvalIds.length, 2);
    assert.deepEqual(awaited.lease.requiredRoles, ["finance", "ceo"]);
  }
});

test("S5: the zero-keyholder path cannot be reached by an action that resolves to keyholders", async () => {
  const seam = stores();
  const governed = await seam.decisions.read(T0);

  // The lease issuer re-resolves from the canonical action, so a record that
  // merely claims an empty keyholder set is refused.
  const material = createProposal(proposalPayload("30000000000"), governed, T0);
  expectDenied("APPROVALS_MISSING", () => issueProposalLease(material, T0));

  // Tampering with the action after resolution is caught by the hash check.
  const routine = createProposal(proposalPayload("9000000000"), governed, T0);
  const tampered = structuredClone(routine);
  tampered.action.businessDecision.budgetCapMicros = "24000000000";
  expectDenied("HASH_MISMATCH", () => issueProposalLease(tampered, T0));
});

test("S6: malformed material fields are rejected, never resolved to zero keyholders", async () => {
  const seam = stores();
  for (const budget of ["3e10", "-30000000000", "025000000000", "24999999999.9"]) {
    await assert.rejects(
      proposeActionSeam(seam, proposalPayload(budget), T0),
      (error) => error instanceof AuthorityError && error.code === "INVALID_INPUT",
    );
  }
  await assert.rejects(
    proposeActionSeam(
      seam,
      {
        action: {
          ...proposalPayload("9000000000").action,
          businessDecision: {
            budgetCapMicros: "9000000000",
            currencyCode: "USD",
            startDate: "2026-08-17",
            endDate: "2026-08-30",
          },
        },
      },
      T0,
    ),
    (error) => error instanceof AuthorityError && error.code === "INVALID_INPUT",
  );
});

test("S7: a keyholder action that is not the governed decision is rejected, not left pending", async () => {
  const seam = stores();
  await assert.rejects(
    proposeActionSeam(seam, proposalPayload("27000000000"), T0),
    (error) => error instanceof AuthorityError && error.code === "INVALID_INPUT",
  );
});

test("S8: a lease for a materially different governed action is never handed to the proposal", async () => {
  const seam = stores();
  const view = await proposeActionSeam(seam, proposalPayload("30000000000"), T0);

  // Simulate the governed decision drifting materially away from the proposal.
  const drifted = await seam.decisions.update((state) => {
    const next = structuredClone(state);
    next.actions.at(-1)!.businessDecision.startDate = "2026-09-01";
    return next;
  }, T1);
  assert.equal(drifted.actions.at(-1)!.businessDecision.startDate, "2026-09-01");

  const awaited = await awaitDecisionSeam(seam, view.decisionId, T1);
  assert.equal(awaited.state, "DENIED");
});

test("S9: awaiting an unknown decision id fails with DECISION_NOT_FOUND", async () => {
  const seam = stores();
  await assert.rejects(
    awaitDecisionSeam(seam, `proposal_${"0".repeat(32)}`, T0),
    (error) => error instanceof AuthorityError && error.code === "DECISION_NOT_FOUND",
  );
  await assert.rejects(
    awaitDecisionSeam(seam, "../../../etc/passwd", T0),
    (error) => error instanceof AuthorityError && error.code === "INVALID_INPUT",
  );
});
