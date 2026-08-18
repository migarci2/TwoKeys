import { NextRequest, NextResponse } from "next/server";

import {
  AuthorityError,
  addCeoCondition,
  approve,
  issueLease,
  revokeLease,
} from "@/lib/server/authority";
import { decisionView } from "@/lib/server/dto";
import { getCampaignGateway } from "@/lib/server/executor";
import { executeCurrentDecision, reconcileCurrentDecision } from "@/lib/server/service";
import { requestHasAllowedOrigin } from "@/lib/server/request-origin";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
import { getDecisionStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Command =
  | { type: "approve" }
  | { type: "condition"; executeBefore: string }
  | { type: "issue_lease" }
  | { type: "execute" }
  | { type: "reconcile" }
  | { type: "revoke_lease"; leaseId: string };

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function session(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

async function parseCommand(request: NextRequest): Promise<Command> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new AuthorityError("INVALID_INPUT", "Expected application/json.");
  }
  const text = await request.text();
  if (text.length > 2_048) {
    throw new AuthorityError("INVALID_INPUT", "Request body is too large.");
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new AuthorityError("INVALID_INPUT", "Request body is not valid JSON.");
  }
  if (!body || typeof body !== "object" || typeof (body as { type?: unknown }).type !== "string") {
    throw new AuthorityError("INVALID_INPUT", "Command type is required.");
  }
  const command = body as Record<string, unknown>;
  if (
    command.type === "approve" ||
    command.type === "issue_lease" ||
    command.type === "execute" ||
    command.type === "reconcile"
  ) {
    return { type: command.type };
  }
  if (command.type === "condition" && typeof command.executeBefore === "string") {
    return { type: "condition", executeBefore: command.executeBefore };
  }
  if (command.type === "revoke_lease" && typeof command.leaseId === "string") {
    return { type: "revoke_lease", leaseId: command.leaseId };
  }
  throw new AuthorityError("INVALID_INPUT", "Command fields are invalid.");
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorityError) {
    const status = error.code === "INVALID_INPUT" ? 400 : error.code === "ROLE_FORBIDDEN" ? 403 : 409;
    return response({ error: error.message, code: error.code }, status);
  }
  console.error("TwoKeys API error", error instanceof Error ? error.message : "unknown error");
  return response(
    { error: "The backend could not complete this operation. Check its configuration and logs." },
    503,
  );
}

export async function GET(request: NextRequest) {
  try {
    const actor = session(request);
    if (!actor) return response({ error: "Sign in as Finance or CEO." }, 401);
    const state = await getDecisionStore().read();
    return response(decisionView(state, actor.role));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!requestHasAllowedOrigin(request)) return response({ error: "Origin is not allowed." }, 403);
    const actor = session(request);
    if (!actor) return response({ error: "Sign in as Finance or CEO." }, 401);
    const command = await parseCommand(request);
    const store = getDecisionStore();
    const now = new Date().toISOString();
    let state;

    if (command.type === "approve") {
      state = await store.update(
        (current) => approve(current, actor.role, actor.principalId, now),
        now,
      );
    } else if (command.type === "condition") {
      state = await store.update(
        (current) => addCeoCondition(current, actor.role, command.executeBefore, now),
        now,
      );
    } else if (command.type === "issue_lease") {
      state = await store.update((current) => issueLease(current, now), now);
    } else if (command.type === "revoke_lease") {
      state = await store.update(
        (current) => revokeLease(current, command.leaseId, now),
        now,
      );
    } else if (command.type === "execute") {
      state = await executeCurrentDecision(store, getCampaignGateway());
    } else {
      state = await reconcileCurrentDecision(store, getCampaignGateway());
    }

    return response(decisionView(state, actor.role));
  } catch (error) {
    return errorResponse(error);
  }
}
