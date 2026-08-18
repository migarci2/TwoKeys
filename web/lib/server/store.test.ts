import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthorityError,
  addCeoCondition,
  approve,
  issueLease,
} from "./authority.ts";
import { MemoryDecisionStore, stateBackend } from "./store.ts";

test("Cloud Run refuses ephemeral decision and role-memory state", () => {
  const previousService = process.env.K_SERVICE;
  const previousBackend = process.env.STATE_BACKEND;
  try {
    process.env.K_SERVICE = "twokeys";
    process.env.STATE_BACKEND = "memory";
    assert.throws(() => stateBackend(), /Cloud Run requires STATE_BACKEND=firestore/);
  } finally {
    if (previousService === undefined) delete process.env.K_SERVICE;
    else process.env.K_SERVICE = previousService;
    if (previousBackend === undefined) delete process.env.STATE_BACKEND;
    else process.env.STATE_BACKEND = previousBackend;
  }
});

test("transactional updates serialize competing lease issuance", async () => {
  const store = new MemoryDecisionStore();
  await store.update((state) => approve(state, "finance", "finance", "2026-08-14T09:01:00Z"), "2026-08-14T09:00:00Z");
  await store.update(
    (state) => addCeoCondition(state, "ceo", "2026-08-17T08:00:00Z", "2026-08-14T09:02:00Z"),
  );
  await store.update((state) => approve(state, "finance", "finance", "2026-08-14T09:03:00Z"));
  await store.update((state) => approve(state, "ceo", "ceo", "2026-08-14T09:03:01Z"));

  const results = await Promise.allSettled([
    store.update((state) => issueLease(state, "2026-08-14T09:04:00Z")),
    store.update((state) => issueLease(state, "2026-08-14T09:04:00Z")),
  ]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const rejected = results.find((item) => item.status === "rejected");
  assert.ok(
    rejected?.status === "rejected" &&
      rejected.reason instanceof AuthorityError &&
      rejected.reason.code === "LEASE_EXISTS",
  );
});
