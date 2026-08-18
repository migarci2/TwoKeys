import { randomUUID } from "node:crypto";

import type { Role } from "./authority.ts";
import {
  CEO_FEEDBACK,
  type RoleFeedbackMemory,
  type SurfaceRun,
} from "./surface.ts";
import { getFirestore, stateBackend } from "./store.ts";

const MEMORY_COLLECTION = "twokeys_role_memory";
const RUN_COLLECTION = "twokeys_surface_runs";

declare global {
  var __twoKeysRoleMemories: Map<Role, RoleFeedbackMemory[]> | undefined;
  var __twoKeysSurfaceRuns: Map<string, SurfaceRun> | undefined;
}

function usesFirestore(): boolean {
  return stateBackend() === "firestore";
}

export function roleMemoryDocumentId(role: Role): string {
  return `${MEMORY_COLLECTION}/${role}`;
}

export async function readRoleMemories(role: Role): Promise<RoleFeedbackMemory[]> {
  if (!usesFirestore()) {
    globalThis.__twoKeysRoleMemories ??= new Map();
    return structuredClone(globalThis.__twoKeysRoleMemories.get(role) ?? []);
  }
  const snapshot = await getFirestore().collection(MEMORY_COLLECTION).doc(role).get();
  if (!snapshot.exists) return [];
  const memories = snapshot.data()?.memories;
  if (!Array.isArray(memories)) throw new Error("Stored role memory has an unsupported schema.");
  return memories as RoleFeedbackMemory[];
}

export async function rememberCeoFeedback(
  role: Role,
  now = new Date().toISOString(),
): Promise<RoleFeedbackMemory[]> {
  if (role !== "ceo") throw new Error("Only the CEO can confirm CEO-owned feedback.");
  const create = (current: RoleFeedbackMemory[]) => {
    if (current.some((memory) => memory.scope === "launch_decisions_above_20000_eur")) {
      return current;
    }
    return [
      ...current,
      {
        memoryId: `memory_${randomUUID().replaceAll("-", "")}`,
        ownerRole: "ceo" as const,
        scope: "launch_decisions_above_20000_eur" as const,
        preference: {
          leadWith: "smallest_reversible_pilot" as const,
          include: ["opportunity_cost"] as ["opportunity_cost"],
          deEmphasize: ["top_line_funnel"] as ["top_line_funnel"],
        },
        sourceEpisode: "launch-eu-001" as const,
        confirmedByPrincipal: true as const,
        createdAt: now,
      },
    ];
  };

  if (!usesFirestore()) {
    globalThis.__twoKeysRoleMemories ??= new Map();
    const next = create(globalThis.__twoKeysRoleMemories.get(role) ?? []);
    globalThis.__twoKeysRoleMemories.set(role, structuredClone(next));
    return structuredClone(next);
  }
  const ref = getFirestore().collection(MEMORY_COLLECTION).doc(role);
  return getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.exists ? snapshot.data()?.memories : [];
    if (!Array.isArray(stored)) throw new Error("Stored role memory has an unsupported schema.");
    const next = create(stored as RoleFeedbackMemory[]);
    transaction.set(ref, {
      ownerRole: role,
      feedback: CEO_FEEDBACK,
      memories: next,
      updatedAt: now,
    });
    return next;
  });
}

export async function recordSurfaceRun(run: SurfaceRun): Promise<void> {
  if (!usesFirestore()) {
    globalThis.__twoKeysSurfaceRuns ??= new Map();
    globalThis.__twoKeysSurfaceRuns.set(run.runId, structuredClone(run));
    return;
  }
  await getFirestore().collection(RUN_COLLECTION).doc(run.runId).set(run);
}
