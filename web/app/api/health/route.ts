import { NextResponse } from "next/server";

import { getDecisionStore, stateBackend } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = stateBackend();
    await getDecisionStore().read();
    return NextResponse.json(
      { status: "ok", state },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("TwoKeys health check failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
