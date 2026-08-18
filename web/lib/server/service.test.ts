import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthorityError,
  addCeoCondition,
  approve,
  currentAction,
  issueLease,
  type CampaignStatus,
} from "./authority.ts";
import type { CampaignGateway } from "./executor.ts";
import { executeCurrentDecision, reconcileCurrentDecision } from "./service.ts";
import { MemoryDecisionStore } from "./store.ts";

async function authorizedStore(): Promise<MemoryDecisionStore> {
  const store = new MemoryDecisionStore();
  await store.update((state) => approve(state, "finance", "finance", "2026-08-14T09:01:00Z"), "2026-08-14T09:00:00Z");
  await store.update((state) => addCeoCondition(state, "ceo", "2026-08-17T08:00:00Z", "2026-08-14T09:02:00Z"));
  await store.update((state) => approve(state, "finance", "finance", "2026-08-14T09:03:00Z"));
  await store.update((state) => approve(state, "ceo", "ceo", "2026-08-14T09:03:01Z"));
  await store.update((state) => issueLease(state, "2026-08-14T09:04:00Z"));
  return store;
}

test("an uncertain provider response reconciles by read-back without a second mutation", async () => {
  const store = await authorizedStore();
  const state = await store.read();
  const snapshotHash = currentAction(state).campaign.configurationSnapshotHash;
  let status: CampaignStatus = "PAUSED";
  let mutations = 0;
  const gateway: CampaignGateway = {
    async read() {
      return {
        resourceName: "customers/test/campaigns/preconfigured",
        status,
        configurationSnapshotHash: snapshotHash,
      };
    },
    async enable() {
      mutations += 1;
      status = "ENABLED";
      throw new Error("network response lost");
    },
  };
  const times = [
    "2026-08-14T09:04:01Z",
    "2026-08-14T09:04:02Z",
    "2026-08-14T09:04:03Z",
    "2026-08-14T09:04:04Z",
    "2026-08-14T09:04:05Z",
    "2026-08-14T09:04:06Z",
  ];

  await assert.rejects(executeCurrentDecision(store, gateway, () => times.shift()!), /network response lost/);
  const consumed = await store.read();
  assert.equal(consumed.leases.at(-1)?.consumedAt !== null, true);
  assert.equal(consumed.receipts.length, 0);

  const reconciled = await reconcileCurrentDecision(store, gateway, () => times.shift()!);
  assert.equal(reconciled.receipts.length, 1);
  assert.equal(reconciled.receipts[0]?.requestId, null);
  assert.equal(mutations, 1);
});

test("a consumed unresolved execution freezes authority-bearing changes", async () => {
  const store = await authorizedStore();
  const state = await store.read();
  const snapshotHash = currentAction(state).campaign.configurationSnapshotHash;
  const gateway: CampaignGateway = {
    async read() {
      return {
        resourceName: "customers/test/campaigns/preconfigured",
        status: "PAUSED",
        configurationSnapshotHash: snapshotHash,
      };
    },
    async enable() {
      throw new Error("provider unavailable");
    },
  };
  const times = [
    "2026-08-14T09:04:01Z",
    "2026-08-14T09:04:02Z",
    "2026-08-14T09:04:03Z",
  ];
  await assert.rejects(executeCurrentDecision(store, gateway, () => times.shift()!), /provider unavailable/);
  await assert.rejects(
    store.update((current) =>
      addCeoCondition(current, "ceo", "2026-08-18T08:00:00Z", "2026-08-14T09:05:00Z"),
    ),
    (error) => error instanceof AuthorityError && error.code === "RECONCILIATION_REQUIRED",
  );
});
