import { NextRequest, NextResponse } from "next/server";

import { type Role, REQUIRED_ROLES } from "@/lib/server/authority";
import {
  SESSION_COOKIE,
  accessCodeIsValid,
  createSessionToken,
  sessionMaxAge,
  verifySessionToken,
} from "@/lib/server/session";
import { requestHasAllowedOrigin } from "@/lib/server/request-origin";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function rateLimited(key: string, now = Date.now()): boolean {
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 5 * 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 8;
}

export function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json(
    { role: session?.role ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!requestHasAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }
  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again in five minutes." },
      { status: 429 },
    );
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }

  const text = await request.text();
  if (text.length > 1_024) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON." }, { status: 400 });
  }
  const role = (body as { role?: unknown })?.role;
  const accessCode = (body as { accessCode?: unknown })?.accessCode;
  if (
    typeof role !== "string" ||
    !REQUIRED_ROLES.includes(role as Role) ||
    typeof accessCode !== "string" ||
    !accessCodeIsValid(role as Role, accessCode)
  ) {
    return NextResponse.json({ error: "Role or access code is invalid." }, { status: 401 });
  }

  const typedRole = role as Role;
  const response = NextResponse.json({ role: typedRole });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(SESSION_COOKIE, createSessionToken(typedRole, `demo-${typedRole}`), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: sessionMaxAge,
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ signedOut: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
