import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken, verifySessionToken } from "./session.ts";

const SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
const NOW = Date.parse("2026-08-14T09:00:00.000Z");

test("session round-trip preserves only role, principal and timestamps", () => {
  const token = createSessionToken("finance", "finance-demo", NOW, SECRET);
  assert.deepEqual(verifySessionToken(token, NOW + 1, SECRET), {
    version: 1,
    role: "finance",
    principalId: "finance-demo",
    issuedAt: NOW,
    expiresAt: NOW + 3_600_000,
  });
});

test("tampered and expired sessions are rejected", () => {
  const token = createSessionToken("ceo", "ceo-demo", NOW, SECRET);
  const [payload, signature] = token.split(".");
  assert.equal(verifySessionToken(`${payload}x.${signature}`, NOW + 1, SECRET), null);
  assert.equal(verifySessionToken(token, NOW + 3_600_001, SECRET), null);
});
