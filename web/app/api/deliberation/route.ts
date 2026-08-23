import { NextRequest, NextResponse } from "next/server";

import { runDeliberationTurn } from "@/lib/server/deliberation";
import {
  appendDeliberation,
  newTurn,
  readDeliberation,
} from "@/lib/server/deliberation-store";
import { requestHasAllowedOrigin } from "@/lib/server/request-origin";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function actor(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  try {
    const session = actor(request);
    if (!session) return response({ error: "Sign in as Finance or CEO." }, 401);
    return response({ turns: await readDeliberation(session.role) });
  } catch (error) {
    console.error("TwoKeys deliberation read error", error instanceof Error ? error.message : "unknown error");
    return response({ error: "The private deliberation could not be loaded." }, 503);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!requestHasAllowedOrigin(request)) return response({ error: "Origin is not allowed." }, 403);
    const session = actor(request);
    if (!session) return response({ error: "Sign in as Finance or CEO." }, 401);
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return response({ error: "Expected application/json." }, 415);
    }
    const text = await request.text();
    if (text.length > 2_048) return response({ error: "Request body is too large." }, 413);
    let message: unknown;
    try {
      message = (JSON.parse(text) as { message?: unknown }).message;
    } catch {
      return response({ error: "Request body is not valid JSON." }, 400);
    }
    if (typeof message !== "string" || !message.trim() || message.length > 1_000) {
      return response({ error: "Message must be 1–1000 characters." }, 400);
    }
    const history = await readDeliberation(session.role);
    const reply = await runDeliberationTurn({ role: session.role, message, history });
    const now = new Date().toISOString();
    const turns = await appendDeliberation(
      session.role,
      [
        newTurn("keyholder", message.trim(), "keyholder", [], now),
        newTurn("agent", reply.text, reply.source, reply.citations, now),
      ],
      now,
    );
    return response({ turns, reply });
  } catch (error) {
    console.error("TwoKeys deliberation error", error instanceof Error ? error.message : "unknown error");
    return response({ error: "The deliberation agent could not answer from the approved evidence." }, 503);
  }
}
