import { NextRequest, NextResponse } from "next/server";

import { AuthorityError } from "@/lib/server/authority";
import { getProposalStore } from "@/lib/server/proposal-store";
import { agentSeamRequestIsAuthorized, awaitDecisionSeam } from "@/lib/server/seam";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ decisionId: string }> },
) {
  try {
    if (!agentSeamRequestIsAuthorized(request.headers.get("authorization"))) {
      return seamResponse({ error: "Agent credentials are required." }, 401);
    }
    const { decisionId } = await params;
    const view = await awaitDecisionSeam(
      { decisions: getDecisionStore(), proposals: getProposalStore() },
      decisionId,
    );
    return seamResponse(view);
  } catch (error) {
    return seamErrorResponse(error);
  }
}
