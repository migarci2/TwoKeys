import { NextRequest, NextResponse } from "next/server";

import { getProposalStore } from "@/lib/server/proposal-store";
import { requestHasAllowedOrigin } from "@/lib/server/request-origin";
import { runRevenueAgent } from "@/lib/server/revenue-agent";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
import { getDecisionStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!requestHasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Sign in before running the Revenue Agent." }, { status: 401 });
  }
  try {
    const run = await runRevenueAgent({
      decisions: getDecisionStore(),
      proposals: getProposalStore(),
    });
    return NextResponse.json(run, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("TwoKeys Revenue Agent error", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "The Revenue Agent could not create a valid proposal." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
