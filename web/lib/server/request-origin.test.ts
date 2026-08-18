import assert from "node:assert/strict";
import test from "node:test";

import { requestHasAllowedOrigin } from "./request-origin.ts";

function request(origin: string, host = "127.0.0.1:3111") {
  return {
    url: "http://localhost:3111/api/decision",
    headers: new Headers({ origin, host }),
  };
}

test("same public host is accepted even when the internal URL host differs", () => {
  assert.equal(requestHasAllowedOrigin(request("http://127.0.0.1:3111")), true);
});

test("cross-site and malformed origins are rejected", () => {
  assert.equal(requestHasAllowedOrigin(request("https://attacker.example")), false);
  assert.equal(requestHasAllowedOrigin(request("not a URL")), false);
});

test("APP_ORIGIN is the production authority when configured", () => {
  assert.equal(
    requestHasAllowedOrigin(request("https://twokeys.example"), "https://twokeys.example"),
    true,
  );
  assert.equal(
    requestHasAllowedOrigin(request("http://127.0.0.1:3111"), "https://twokeys.example"),
    false,
  );
});
