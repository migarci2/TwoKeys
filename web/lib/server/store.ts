import { Firestore } from "@google-cloud/firestore";

import {
  ACTION_ID,
  createInitialDecision,
  type DecisionAggregate,
} from "./authority.ts";

declare global {
  var __twoKeysFirestore: Firestore | undefined;
}

export function getFirestore(): Firestore {
  globalThis.__twoKeysFirestore ??= new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
  });
  return globalThis.__twoKeysFirestore;
}

export interface DecisionStore {
  read(now?: string): Promise<DecisionAggregate>;
  update(
    change: (current: DecisionAggregate) => DecisionAggregate,
    now?: string,
  ): Promise<DecisionAggregate>;
  reset(now?: string): Promise<DecisionAggregate>;
}

function assertAggregate(value: unknown): asserts value is DecisionAggregate {
  if (
    !value ||
    typeof value !== "object" ||
    (value as DecisionAggregate).schemaVersion !== "twokeys.decision.v1" ||
    (value as DecisionAggregate).actionId !== ACTION_ID ||
    !Array.isArray((value as DecisionAggregate).actions)
  ) {
    throw new Error("Stored TwoKeys decision has an unsupported schema.");
  }
}

function initialDecision(now: string): DecisionAggregate {
  return createInitialDecision(now, process.env.GOOGLE_ADS_CONFIGURATION_SNAPSHOT_HASH);
}

export class MemoryDecisionStore implements DecisionStore {
  private state: DecisionAggregate | null = null;
  private queue: Promise<void> = Promise.resolve();

  async read(now = new Date().toISOString()): Promise<DecisionAggregate> {
    if (!this.state) this.state = initialDecision(now);
    return structuredClone(this.state);
  }

  async update(
    change: (current: DecisionAggregate) => DecisionAggregate,
    now = new Date().toISOString(),
  ): Promise<DecisionAggregate> {
    let result!: DecisionAggregate;
    const operation = this.queue.then(() => {
      const current = this.state ?? initialDecision(now);
      result = change(structuredClone(current));
      this.state = structuredClone(result);
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    await operation;
    return structuredClone(result);
  }

  async reset(now = new Date().toISOString()): Promise<DecisionAggregate> {
    return this.update(() => initialDecision(now), now);
  }
}

export class FirestoreDecisionStore implements DecisionStore {
  private readonly firestore: Firestore;
  private readonly collection: string;

  constructor() {
    this.firestore = getFirestore();
    this.collection = process.env.FIRESTORE_COLLECTION || "twokeys_decisions";
  }

  private get ref() {
    return this.firestore.collection(this.collection).doc(ACTION_ID);
  }

  async read(now = new Date().toISOString()): Promise<DecisionAggregate> {
    const snapshot = await this.ref.get();
    if (snapshot.exists) {
      const value = snapshot.data();
      assertAggregate(value);
      return value;
    }
    return this.update((current) => current, now);
  }

  async update(
    change: (current: DecisionAggregate) => DecisionAggregate,
    now = new Date().toISOString(),
  ): Promise<DecisionAggregate> {
    // ponytail: one aggregate document gives this one-decision demo atomic writes;
    // split by action/version only when multi-decision write throughput matters.
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(this.ref);
      const stored = snapshot.exists ? snapshot.data() : initialDecision(now);
      assertAggregate(stored);
      const next = change(structuredClone(stored));
      transaction.set(this.ref, next);
      return next;
    });
  }

  async reset(now = new Date().toISOString()): Promise<DecisionAggregate> {
    const next = initialDecision(now);
    await this.ref.set(next);
    return next;
  }
}

declare global {
  var __twoKeysDecisionStore: DecisionStore | undefined;
}

export function stateBackend(): "memory" | "firestore" {
  const backend =
    process.env.STATE_BACKEND ||
    (process.env.K_SERVICE || process.env.NODE_ENV === "production"
      ? "firestore"
      : "memory");
  if (backend !== "memory" && backend !== "firestore") {
    throw new Error("STATE_BACKEND must be 'memory' or 'firestore'.");
  }
  if (process.env.K_SERVICE && backend !== "firestore") {
    throw new Error("Cloud Run requires STATE_BACKEND=firestore.");
  }
  return backend;
}

export function getDecisionStore(): DecisionStore {
  if (globalThis.__twoKeysDecisionStore) return globalThis.__twoKeysDecisionStore;

  const backend = stateBackend();
  globalThis.__twoKeysDecisionStore =
    backend === "firestore" ? new FirestoreDecisionStore() : new MemoryDecisionStore();
  return globalThis.__twoKeysDecisionStore;
}
