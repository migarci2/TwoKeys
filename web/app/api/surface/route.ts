import { NextRequest, NextResponse } from "next/server";

import type { Role } from "@/lib/server/authority";
import { requestHasAllowedOrigin } from "@/lib/server/request-origin";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
import { composeRoleSurface, type SurfaceRun } from "@/lib/server/surface";
import {
  readRoleMemories,
  recordSurfaceRun,
  rememberCeoFeedback,
  roleMemoryDocumentId,
} from "@/lib/server/surface-store";
import { getDecisionStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Command = { type: "remember_feedback" } | { type: "compare_memory" };

class SurfaceRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function actor(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

function publicRun(run: SurfaceRun, memoryApplied: boolean) {
  return {
    surface: run.surface,
    a2ui: run.a2ui,
    bindings: run.bindings,
    generator: {
      source: run.source,
      modelId: run.modelId,
      thinkingLevel: run.thinkingLevel,
      promptVersion: run.promptVersion,
      a2uiVersion: run.a2uiVersion,
      catalogVersion: run.catalogVersion,
      memoryApplied,
    },
  };
}

async function parseCommand(request: NextRequest): Promise<Command> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new SurfaceRequestError("Expected application/json.", 415);
  }
  const text = await request.text();
  if (text.length > 512) throw new SurfaceRequestError("Request body is too large.", 413);
  let value: { type?: unknown };
  try {
    value = JSON.parse(text) as { type?: unknown };
  } catch {
    throw new SurfaceRequestError("Request body is not valid JSON.", 400);
  }
  if (value.type !== "remember_feedback" && value.type !== "compare_memory") {
    throw new SurfaceRequestError("Surface command is invalid.", 400);
  }
  return { type: value.type };
}

async function compose(
  role: Role,
  memories: Awaited<ReturnType<typeof readRoleMemories>>,
  memoryDocumentId: string | null,
  episode: "current" | "later" = "current",
) {
  const state = await getDecisionStore().read();
  const run = await composeRoleSurface({ role, state, memories, memoryDocumentId, episode });
  await recordSurfaceRun(run);
  return run;
}

function errorResponse(error: unknown) {
  if (error instanceof SurfaceRequestError) {
    return response({ error: error.message }, error.status);
  }
  console.error("TwoKeys surface error", error instanceof Error ? error.message : "unknown error");
  return response(
    { error: "The role surface could not be composed. The authority workflow remains available." },
    503,
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = actor(request);
    if (!session) return response({ error: "Sign in as Finance or CEO." }, 401);
    const memories = await readRoleMemories(session.role);
    const run = await compose(session.role, memories, roleMemoryDocumentId(session.role));
    return response(publicRun(run, memories.length > 0));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!requestHasAllowedOrigin(request)) return response({ error: "Origin is not allowed." }, 403);
    const session = actor(request);
    if (!session) return response({ error: "Sign in as Finance or CEO." }, 401);
    const command = await parseCommand(request);
    if (session.role !== "ceo") return response({ error: "Only the CEO owns this feedback." }, 403);

    if (command.type === "remember_feedback") {
      const memories = await rememberCeoFeedback(session.role);
      return response({ remembered: true, count: memories.length });
    }

    const memories = await readRoleMemories(session.role);
    if (memories.length === 0) {
      return response({ error: "Confirm the CEO feedback before running the comparison." }, 409);
    }
    const [control, treatment] = await Promise.all([
      compose("ceo", [], null, "later"),
      compose("ceo", memories, roleMemoryDocumentId("ceo"), "later"),
    ]);
    return response({
      control: publicRun(control, false),
      treatment: publicRun(treatment, true),
      unchanged: {
        evidenceHash: control.bindings.evidenceHash === treatment.bindings.evidenceHash,
        policyVersion: control.bindings.policyVersion === treatment.bindings.policyVersion,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
