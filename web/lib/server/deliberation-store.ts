import { randomUUID } from "node:crypto";

import { ACTION_ID, type Role } from "./authority.ts";
import { getFirestore, stateBackend } from "./store.ts";

export interface DeliberationTurn {
  turnId: string;
  speaker: "keyholder" | "agent";
  text: string;
  citations: string[];
  source: "keyholder" | "adk" | "fallback";
  createdAt: string;
}

const COLLECTION = "twokeys_deliberations";

declare global {
  var __twoKeysDeliberations: Map<Role, DeliberationTurn[]> | undefined;
}

function greeting(role: Role, now: string): DeliberationTurn {
  return {
    turnId: `turn_${randomUUID().replaceAll("-", "")}`,
    speaker: "agent",
    text:
      role === "finance"
        ? "You own affordability and downside for this decision. Ask about the budget, assumptions, or counterevidence before approving."
        : "You own strategic priority and opportunity cost. Ask about alternatives, or state a condition and I will clarify it before it changes the action.",
    citations: [],
    source: "fallback",
    createdAt: now,
  };
}

function validateTurns(value: unknown): DeliberationTurn[] {
  if (!Array.isArray(value)) throw new Error("Stored deliberation has an unsupported schema.");
  return value as DeliberationTurn[];
}

export async function readDeliberation(
  role: Role,
  now = new Date().toISOString(),
): Promise<DeliberationTurn[]> {
  if (stateBackend() === "memory") {
    globalThis.__twoKeysDeliberations ??= new Map();
    const current = globalThis.__twoKeysDeliberations.get(role) ?? [greeting(role, now)];
    globalThis.__twoKeysDeliberations.set(role, current);
    return structuredClone(current);
  }
  const ref = getFirestore().collection(COLLECTION).doc(`${ACTION_ID}-${role}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    const turns = [greeting(role, now)];
    await ref.create({ actionId: ACTION_ID, ownerRole: role, turns, updatedAt: now });
    return turns;
  }
  return validateTurns(snapshot.data()?.turns);
}

export async function appendDeliberation(
  role: Role,
  additions: DeliberationTurn[],
  now = new Date().toISOString(),
): Promise<DeliberationTurn[]> {
  if (additions.some((turn) => turn.speaker === "keyholder" && turn.source !== "keyholder")) {
    throw new Error("Keyholder turns must be recorded as keyholder input.");
  }
  if (stateBackend() === "memory") {
    const current = await readDeliberation(role, now);
    const next = current.concat(additions);
    globalThis.__twoKeysDeliberations!.set(role, structuredClone(next));
    return next;
  }
  const ref = getFirestore().collection(COLLECTION).doc(`${ACTION_ID}-${role}`);
  return getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists
      ? validateTurns(snapshot.data()?.turns)
      : [greeting(role, now)];
    const next = current.concat(additions);
    transaction.set(ref, { actionId: ACTION_ID, ownerRole: role, turns: next, updatedAt: now });
    return next;
  });
}

export function newTurn(
  speaker: DeliberationTurn["speaker"],
  text: string,
  source: DeliberationTurn["source"],
  citations: string[] = [],
  now = new Date().toISOString(),
): DeliberationTurn {
  return {
    turnId: `turn_${randomUUID().replaceAll("-", "")}`,
    speaker,
    text,
    citations,
    source,
    createdAt: now,
  };
}
