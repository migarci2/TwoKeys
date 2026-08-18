import assert from "node:assert/strict";
import test from "node:test";

import { addCeoCondition, approve, AuthorityError, issueLease } from "./authority.ts";
import { readRoleMemories, rememberCeoFeedback } from "./surface-store.ts";
import { FirestoreDecisionStore, getFirestore } from "./store.ts";

test("Firestore serializes lease issuance and isolates role memory", async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "FIRESTORE_EMULATOR_HOST is required");
  const store = new FirestoreDecisionStore();
  await Promise.all([
    getFirestore().collection("twokeys_role_memory").doc("finance").delete(),
    getFirestore().collection("twokeys_role_memory").doc("ceo").delete(),
  ]);
  await store.reset("2026-08-14T09:00:00Z");
  await store.update((state) => approve(state, "finance", "finance", "2026-08-14T09:01:00Z"));
  await store.update((state) =>
    addCeoCondition(state, "ceo", "2026-08-17T08:00:00Z", "2026-08-14T09:02:00Z"),
  );
  await store.update((state) => approve(state, "finance", "finance", "2026-08-14T09:03:00Z"));
  await store.update((state) => approve(state, "ceo", "ceo", "2026-08-14T09:03:01Z"));

  const leases = await Promise.allSettled([
    store.update((state) => issueLease(state, "2026-08-14T09:04:00Z")),
    store.update((state) => issueLease(state, "2026-08-14T09:04:00Z")),
  ]);
  assert.equal(leases.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(
    leases.some(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof AuthorityError &&
        result.reason.code === "LEASE_EXISTS",
    ),
    true,
  );
  assert.equal((await store.read()).leases.length, 1);

  await rememberCeoFeedback("ceo", "2026-08-14T09:05:00Z");
  assert.equal((await readRoleMemories("ceo")).length, 1);
  assert.deepEqual(await readRoleMemories("finance"), []);
});
