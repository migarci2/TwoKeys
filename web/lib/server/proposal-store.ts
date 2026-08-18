import type { ProposalDecisionRecord } from "./seam.ts";
import { getFirestore, stateBackend } from "./store.ts";

/**
 * Proposal decisions are written once at proposal time; awaiting a decision is
 * a pure read, so the store needs no update path. The single mutable decision
 * a bound proposal follows lives in the DecisionStore.
 */
export interface ProposalStore {
  read(decisionId: string): Promise<ProposalDecisionRecord | null>;
  create(record: ProposalDecisionRecord): Promise<ProposalDecisionRecord>;
}

export class MemoryProposalStore implements ProposalStore {
  private records = new Map<string, ProposalDecisionRecord>();

  async read(decisionId: string): Promise<ProposalDecisionRecord | null> {
    const stored = this.records.get(decisionId);
    return stored ? structuredClone(stored) : null;
  }

  async create(record: ProposalDecisionRecord): Promise<ProposalDecisionRecord> {
    if (this.records.has(record.decisionId)) {
      throw new Error("A proposal with this decision id already exists.");
    }
    this.records.set(record.decisionId, structuredClone(record));
    return structuredClone(record);
  }
}

export class FirestoreProposalStore implements ProposalStore {
  private readonly collection: string;

  constructor() {
    this.collection = process.env.FIRESTORE_PROPOSAL_COLLECTION || "twokeys_proposals";
  }

  private ref(decisionId: string) {
    return getFirestore().collection(this.collection).doc(decisionId);
  }

  async read(decisionId: string): Promise<ProposalDecisionRecord | null> {
    const snapshot = await this.ref(decisionId).get();
    if (!snapshot.exists) return null;
    const value = snapshot.data();
    if (
      !value ||
      (value as ProposalDecisionRecord).schemaVersion !== "twokeys.proposal.v1"
    ) {
      throw new Error("Stored TwoKeys proposal has an unsupported schema.");
    }
    return value as ProposalDecisionRecord;
  }

  async create(record: ProposalDecisionRecord): Promise<ProposalDecisionRecord> {
    // create() fails on an existing document, preserving write-once semantics.
    await this.ref(record.decisionId).create(record);
    return record;
  }
}

declare global {
  var __twoKeysProposalStore: ProposalStore | undefined;
}

export function getProposalStore(): ProposalStore {
  globalThis.__twoKeysProposalStore ??=
    stateBackend() === "firestore" ? new FirestoreProposalStore() : new MemoryProposalStore();
  return globalThis.__twoKeysProposalStore;
}
