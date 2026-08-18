import { NextRequest, NextResponse } from "next/server";

import { AuthorityError } from "@/lib/server/authority";
import { getProposalStore } from "@/lib/server/proposal-store";
import { agentSeamRequestIsAuthorized, proposeActionSeam } from "@/lib/server/seam";
import { getDecisionStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function seamResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function seamErrorResponse(error: unknown) {
  if (error instanceof AuthorityError) {
    const status =
      error.code === "INVALID_INPUT" ? 400 : error.code === "DECISION_NOT_FOUND" ? 404 : 409;
    return seamResponse({ error: error.message, code: error.code }, status);
  }
  console.error("TwoKeys seam error", error instanceof Error ? error.message : "unknown error");
  return seamResponse(
    { error: "The backend could not complete this operation. Check its configuration and logs." },
    503,
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!agentSeamRequestIsAuthorized(request.headers.get("authorization"))) {
      return seamResponse({ error: "Agent credentials are required." }, 401);
    }
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new AuthorityError("INVALID_INPUT", "Expected application/json.");
    }
    const text = await request.text();
    if (text.length > 32_768) {
      throw new AuthorityError("INVALID_INPUT", "Request body is too large.");
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new AuthorityError("INVALID_INPUT", "Request body is not valid JSON.");
    }
    const view = await proposeActionSeam(
      { decisions: getDecisionStore(), proposals: getProposalStore() },
      payload,
    );
    return seamResponse(view, 201);
  } catch (error) {
    return seamErrorResponse(error);
  }
}
