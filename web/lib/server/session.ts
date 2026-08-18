import { createHmac, timingSafeEqual } from "node:crypto";

import { REQUIRED_ROLES, type Role } from "./authority.ts";

export const SESSION_COOKIE = "twokeys_session";
const SESSION_SECONDS = 60 * 60;
const DEV_SESSION_SECRET = "twokeys-local-development-only-secret-2026";

export interface SessionPayload {
  version: 1;
  role: Role;
  principalId: string;
  issuedAt: number;
  expiresAt: number;
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SESSION_SECRET;
  throw new SessionError("SESSION_SECRET must contain at least 32 characters.");
}

export function createSessionToken(
  role: Role,
  principalId: string,
  now = Date.now(),
  secret = getSessionSecret(),
): string {
  if (!REQUIRED_ROLES.includes(role) || !principalId.trim()) {
    throw new SessionError("A known role and principal are required.");
  }
  const payload: SessionPayload = {
    version: 1,
    role,
    principalId,
    issuedAt: now,
    expiresAt: now + SESSION_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, secret).toString("base64url")}`;
}

export function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
  secret = getSessionSecret(),
): SessionPayload | null {
  if (!token) return null;
  const [encoded, supplied, extra] = token.split(".");
  if (!encoded || !supplied || extra) return null;

  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(supplied, "base64url");
  } catch {
    return null;
  }
  const expectedSignature = signature(encoded, secret);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (
      payload.version !== 1 ||
      !REQUIRED_ROLES.includes(payload.role as Role) ||
      typeof payload.principalId !== "string" ||
      !Number.isSafeInteger(payload.issuedAt) ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt! <= now ||
      payload.issuedAt! > now + 60_000
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function codeDigest(value: string): Buffer {
  return createHmac("sha256", "twokeys-access-code-comparison").update(value).digest();
}

export function accessCodeIsValid(role: Role, candidate: string): boolean {
  if (process.env.NODE_ENV !== "production" && process.env.LOCAL_DEMO_AUTH === "true") {
    return true;
  }
  const expected =
    role === "finance" ? process.env.FINANCE_ACCESS_CODE : process.env.CEO_ACCESS_CODE;
  if (!expected || expected.length < 8 || candidate.length > 256) return false;
  return timingSafeEqual(codeDigest(candidate), codeDigest(expected));
}

export const sessionMaxAge = SESSION_SECONDS;
